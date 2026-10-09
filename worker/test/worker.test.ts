import { describe, expect, it, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { createHandler, validateBody, type Env } from '../src/index'
import { estimateCost } from '../src/quota'
import { buildMessages, buildSystem, REPLY_SCHEMA } from '../src/tutor'

function memoryKV() {
  const store = new Map<string, string>()
  return {
    store,
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => void store.set(key, value),
    list: async ({ prefix }: { prefix: string }) => ({
      keys: [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    }),
  }
}

const reply = {
  reply: 'Thank you. Can you give me an example of a bug you found?',
  corrections: [{ you_said: 'I have wrote', better: 'I have written', explanation_it: 'Il participio di write è written.' }],
  errors: [{ category: 'irregular_verb', key: 'write' }],
  interview_over: false,
  summary_it: '',
}

function fakeClient(response: Partial<Anthropic.Beta.BetaMessage> = {}) {
  const create = vi.fn(async (_params: Record<string, unknown>) => ({
    model: 'claude-opus-5-5',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(reply) }],
    usage: { input_tokens: 1200, output_tokens: 150, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 },
    ...response,
  }))
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create }
}

const env = (over: Partial<Env> = {}): Env => ({
  ANTHROPIC_API_KEY: 'sk-test',
  ACCESS_CODES: 'secret-code-1,secret-code-2',
  ALLOWED_ORIGINS: 'https://nuraci.github.io',
  USAGE: {} as KVNamespace,
  ...over,
})

function setup(response?: Partial<Anthropic.Beta.BetaMessage>, now = Date.UTC(2026, 9, 9, 10)) {
  const kv = memoryKV()
  const { client, create } = fakeClient(response)
  const handle = createHandler({ client: () => client, now: () => now, kv: () => kv })
  return { handle, kv, create }
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://tutor.example/api/tutor', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer secret-code-2',
      'X-Device-Id': 'device-1234-abcd',
      Origin: 'https://nuraci.github.io',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })

const turn = { mode: 'interview', messages: [{ role: 'user', content: 'I have wrote the test firmware.' }], elapsedMinutes: 3 }

describe('accesso e CORS', () => {
  it('senza codice valido: 401, e nessuna chiamata al modello', async () => {
    const { handle, create } = setup()
    expect((await handle(post(turn, { Authorization: 'Bearer wrong' }), env())).status).toBe(401)
    expect((await handle(post(turn, { Authorization: '' }), env())).status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('preflight CORS solo per le origini ammesse', async () => {
    const { handle } = setup()
    const ok = await handle(new Request('https://tutor.example/api/tutor', { method: 'OPTIONS', headers: { Origin: 'https://nuraci.github.io' } }), env())
    expect(ok.headers.get('Access-Control-Allow-Origin')).toBe('https://nuraci.github.io')
    const evil = await handle(new Request('https://tutor.example/api/tutor', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env())
    expect(evil.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('id del dispositivo obbligatorio', async () => {
    const { handle } = setup()
    expect((await handle(post(turn, { 'X-Device-Id': '' }), env())).status).toBe(400)
  })
})

describe('chiamata al tutor', () => {
  it('modello, fallback, uscita strutturata, cache ed effort come da configurazione', async () => {
    const { handle, create } = setup()
    const res = await handle(post(turn), env())
    expect(res.status).toBe(200)
    const params = create.mock.calls[0]?.[0]
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      cache_control: { type: 'ephemeral' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: REPLY_SCHEMA } },
    })
    expect(params).not.toHaveProperty('thinking')
    expect(params).not.toHaveProperty('temperature')

    const data = (await res.json()) as Record<string, unknown>
    expect(data).toMatchObject({ reply: reply.reply, corrections: reply.corrections, errors: reply.errors, model: 'claude-opus-5-5' })
    expect(data.raw).toBe(JSON.stringify(reply))
  })

  it('modello ed effort si cambiano dalle variabili, senza toccare il codice', async () => {
    const { handle, create } = setup()
    await handle(post(turn), env({ MODEL: 'claude-sonnet-5-5', EFFORT: 'medium' }))
    expect(create.mock.calls[0]?.[0]).toMatchObject({ model: 'claude-sonnet-5-5', output_config: { effort: 'medium' } })
  })

  it('al massimo 3 correzioni', async () => {
    const many = { ...reply, corrections: Array.from({ length: 5 }, () => reply.corrections[0]) }
    const { handle } = setup({ content: [{ type: 'text', text: JSON.stringify(many), citations: null }] as Anthropic.Beta.BetaContentBlock[] })
    const data = (await (await handle(post(turn), env())).json()) as { corrections: unknown[] }
    expect(data.corrections).toHaveLength(3)
  })

  it('un rifiuto dei filtri di sicurezza diventa una risposta 422 gestibile', async () => {
    const { handle } = setup({ stop_reason: 'refusal', content: [] })
    expect((await handle(post(turn), env())).status).toBe(422)
  })

  it('richieste non valide: 400', async () => {
    const { handle, create } = setup()
    expect((await handle(post({ mode: 'chat', messages: [] }), env())).status).toBe(400)
    expect((await handle(post({ mode: 'interview', messages: [{ role: 'assistant', content: 'hi' }] }), env())).status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('controllo dei costi', () => {
  it('conta richieste, token e costo stimato e li restituisce', async () => {
    const { handle, kv } = setup()
    const data = (await (await handle(post(turn), env())).json()) as { usage: { tokens: number; costUsd: number }; quota: { requests: number; requestsLeft: number } }
    expect(data.usage.tokens).toBe(1200 + 150 + 800)
    expect(data.usage.costUsd).toBeCloseTo((1200 * 4 + 80 * 4 + 150 * 20) / 1e6, 8)
    expect(data.quota).toMatchObject({ requests: 1, requestsLeft: 149 })
    expect(kv.store.has('usage:device-1234-abcd:2026-10-09')).toBe(true)
    expect(kv.store.has('usage:all:2026-10-09')).toBe(true)
  })

  it('oltre il limite giornaliero del dispositivo: 429 senza chiamare il modello', async () => {
    const { handle, create } = setup()
    const e = env({ DAILY_REQUESTS: '2' })
    await handle(post(turn), e)
    await handle(post(turn), e)
    const res = await handle(post(turn), e)
    expect(res.status).toBe(429)
    expect(((await res.json()) as { reason: string }).reason).toBe('device')
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('tetto di spesa totale giornaliero', async () => {
    const { handle } = setup()
    const e = env({ DAILY_COST_CAP_USD: '0.000001' })
    await handle(post(turn), e)
    const res = await handle(post(turn, { 'X-Device-Id': 'another-device-99' }), e)
    expect(((await res.json()) as { reason: string }).reason).toBe('global')
  })

  it('/api/usage mostra il consumo di oggi', async () => {
    const { handle } = setup()
    await handle(post(turn), env())
    const res = await handle(new Request('https://tutor.example/api/usage', { headers: { Authorization: 'Bearer secret-code-1', 'X-Device-Id': 'device-1234-abcd' } }), env())
    expect(await res.json()).toMatchObject({ quota: { requests: 1 }, model: 'claude-opus-5-5' })
  })

  it('stima dei costi con la cache', () => {
    expect(estimateCost({ inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, { inputPerMTok: 4, outputPerMTok: 20 })).toBe(4)
    expect(estimateCost({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, { inputPerMTok: 4, outputPerMTok: 20 })).toBeCloseTo(0.4)
  })
})

describe('prompt', () => {
  it('colloquio: ruolo, una domanda alla volta, correzioni in italiano', () => {
    const s = buildSystem({ mode: 'interview' })
    expect(s).toContain('Validation Engineer')
    expect(s).toContain('one question at a time')
    expect(s).toMatch(/Italian/)
    expect(buildSystem({ mode: 'conversation', topic: 'my electronics projects' })).toContain('my electronics projects')
  })

  it('apertura, avviso del tempo e chiusura viaggiano nel turno dell’utente', () => {
    expect(buildMessages({ mode: 'interview', messages: [] })[0]?.content).toContain('start the interview')
    const late = buildMessages({ mode: 'interview', messages: [{ role: 'user', content: 'Yes.' }], elapsedMinutes: 14 })
    expect(late.at(-1)?.content).toContain('wrapping up')
    const finish = buildMessages({ mode: 'interview', messages: [{ role: 'user', content: 'Yes.' }, { role: 'assistant', content: '{}' }], finish: true })
    expect(finish.at(-1)).toMatchObject({ role: 'user' })
    expect(finish.at(-1)?.content).toContain('interview_over')
  })

  it('validateBody limita lunghezza e alternanza dei turni', () => {
    expect(typeof validateBody({ mode: 'interview', messages: [{ role: 'user', content: 'x'.repeat(5000) }] })).toBe('string')
    expect(validateBody({ mode: 'conversation', topic: 'x'.repeat(500), messages: [] })).toMatchObject({ topic: 'x'.repeat(120) })
  })
})

describe('beta: suggerimenti e lista d’attesa', () => {
  const json = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    new Request(`https://tutor.example${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

  it('suggerimenti solo con il codice dei beta tester', async () => {
    const { handle, kv } = setup()
    expect((await handle(json('/api/feedback', { text: 'Bella app!' }), env())).status).toBe(401)
    const ok = await handle(json('/api/feedback', { text: 'Bella app!', page: 'impostazioni', version: '0.11.0' }, { Authorization: 'Bearer secret-code-1', 'X-Device-Id': 'device-1234-abcd' }), env())
    expect(ok.status).toBe(200)
    expect([...kv.store.keys()].some((k) => k.startsWith('feedback:'))).toBe(true)
  })

  it('lista d’attesa: pubblica, con consenso obbligatorio e limite per IP', async () => {
    const { handle, kv } = setup()
    expect((await handle(json('/api/waitlist', { email: 'a@b.it' }), env())).status).toBe(400)
    expect((await handle(json('/api/waitlist', { email: 'non-email', consent: true }), env())).status).toBe(400)
    const ok = await handle(json('/api/waitlist', { email: 'Mario.Rossi@Example.com', consent: true, role: 'Validation engineer' }, { 'CF-Connecting-IP': '1.2.3.4' }), env())
    expect(ok.status).toBe(200)
    expect(JSON.parse(kv.store.get('waitlist:mario.rossi@example.com') ?? '{}')).toMatchObject({ consent: true, role: 'Validation engineer' })
    for (let i = 0; i < 4; i++) await handle(json('/api/waitlist', { email: `x${i}@y.it`, consent: true }, { 'CF-Connecting-IP': '1.2.3.4' }), env())
    expect((await handle(json('/api/waitlist', { email: 'z@y.it', consent: true }, { 'CF-Connecting-IP': '1.2.3.4' }), env())).status).toBe(429)
  })

  it('esportazione solo con il codice amministratore', async () => {
    const { handle } = setup()
    await handle(json('/api/waitlist', { email: 'a@b.it', consent: true }), env())
    const get = (code?: string) => new Request('https://tutor.example/api/admin/export', { headers: code ? { Authorization: `Bearer ${code}` } : {} })
    expect((await handle(get('admin-xyz'), env())).status).toBe(401)
    expect((await handle(get('secret-code-1'), env({ ADMIN_CODE: 'admin-xyz' }))).status).toBe(401)
    const res = await handle(get('admin-xyz'), env({ ADMIN_CODE: 'admin-xyz' }))
    expect(await res.json()).toMatchObject({ waitlist: [{ email: 'a@b.it' }], feedback: [] })
  })
})
