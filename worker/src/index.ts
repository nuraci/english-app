import Anthropic from '@anthropic-ai/sdk'
import { exportPrefix, joinWaitlist, saveFeedback, validateFeedback, validateWaitlist, type ListableKV } from './beta'
import { checkQuota, estimateCost, getQuota, recordUsage, type Limits, type Prices } from './quota'
import { callTutor, TutorRefusal, type ChatTurn, type TutorConfig, type TutorRequest } from './tutor'

export type Env = {
  ANTHROPIC_API_KEY: string
  /** Codici di accesso, separati da virgola: li conosce solo chi usa l'app. */
  ACCESS_CODES: string
  ALLOWED_ORIGINS: string
  USAGE: KVNamespace
  /** Codice per leggere suggerimenti e lista d'attesa (facoltativo: senza, l'esportazione è disattivata). */
  ADMIN_CODE?: string
  MODEL?: string
  EFFORT?: string
  DAILY_REQUESTS?: string
  DAILY_TOKENS?: string
  DAILY_COST_CAP_USD?: string
  PRICE_INPUT_PER_MTOK?: string
  PRICE_OUTPUT_PER_MTOK?: string
}

export type Deps = {
  client: (env: Env) => Anthropic
  now: () => number
  kv: (env: Env) => ListableKV
}

const MAX_TURNS = 80
const MAX_CHARS = 4000

const num = (value: string | undefined, fallback: number) => (value && !Number.isNaN(Number(value)) ? Number(value) : fallback)

function limitsOf(env: Env): Limits {
  return {
    requestsPerDay: num(env.DAILY_REQUESTS, 150),
    tokensPerDay: num(env.DAILY_TOKENS, 400_000),
    costCapUsdPerDay: num(env.DAILY_COST_CAP_USD, 3),
  }
}

function configOf(env: Env): TutorConfig {
  const effort = env.EFFORT === 'medium' || env.EFFORT === 'high' ? env.EFFORT : 'low'
  return { model: env.MODEL || 'claude-opus-5-5', effort, maxTokens: 2000 }
}

function pricesOf(env: Env): Prices {
  return { inputPerMTok: num(env.PRICE_INPUT_PER_MTOK, 4), outputPerMTok: num(env.PRICE_OUTPUT_PER_MTOK, 20) }
}

function corsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  if (!origin || !allowed.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Device-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/** Confronto a tempo costante: non rivela quanti caratteri del codice sono giusti. */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

function bearer(request: Request): string {
  return (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
}

function authorized(env: Env, request: Request): boolean {
  const token = bearer(request)
  if (!token) return false
  return env.ACCESS_CODES.split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .some((code) => safeEqual(code, token))
}

function deviceOf(request: Request): string | null {
  const id = request.headers.get('X-Device-Id') ?? ''
  return /^[a-zA-Z0-9-]{8,64}$/.test(id) ? id : null
}

export function validateBody(body: unknown): TutorRequest | string {
  if (!body || typeof body !== 'object') return 'Corpo della richiesta non valido'
  const b = body as Record<string, unknown>
  if (b.mode !== 'interview' && b.mode !== 'conversation') return 'mode non valido'
  if (!Array.isArray(b.messages) || b.messages.length > MAX_TURNS) return 'messages non valido'
  const messages: ChatTurn[] = []
  for (const [i, m] of (b.messages as unknown[]).entries()) {
    const turn = m as Record<string, unknown>
    const expected = i % 2 === 0 ? 'user' : 'assistant'
    if (turn?.role !== expected || typeof turn.content !== 'string' || turn.content.length > MAX_CHARS) {
      return `messaggio ${i} non valido`
    }
    messages.push({ role: expected, content: turn.content })
  }
  const topic = typeof b.topic === 'string' ? b.topic.slice(0, 120) : undefined
  const elapsedMinutes = typeof b.elapsedMinutes === 'number' ? Math.max(0, Math.min(120, b.elapsedMinutes)) : undefined
  return { mode: b.mode, topic, messages, elapsedMinutes, finish: b.finish === true }
}

export function createHandler(deps: Deps) {
  return async function handle(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env, request.headers.get('Origin'))
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } })

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)

    // Lista d'attesa: pubblica (pagina di presentazione), con consenso esplicito e limite per IP.
    if (url.pathname === '/api/waitlist' && request.method === 'POST') {
      const body = validateWaitlist(await request.json().catch(() => null))
      if (!body) return json({ error: 'bad_request' }, 400)
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
      const result = await joinWaitlist(deps.kv(env), ip, body, deps.now())
      return result === 'ok' ? json({ ok: true }) : json({ error: 'limit' }, 429)
    }

    // Esportazione per l'amministratore: suggerimenti e lista d'attesa.
    if (url.pathname === '/api/admin/export' && request.method === 'GET') {
      if (!env.ADMIN_CODE || !safeEqual(env.ADMIN_CODE, bearer(request))) return json({ error: 'unauthorized' }, 401)
      const kv = deps.kv(env)
      return json({ feedback: await exportPrefix(kv, 'feedback:'), waitlist: await exportPrefix(kv, 'waitlist:') })
    }

    if (!authorized(env, request)) return json({ error: 'unauthorized' }, 401)
    const device = deviceOf(request)
    if (!device) return json({ error: 'device' }, 400)
    const kv = deps.kv(env)
    const limits = limitsOf(env)

    if (url.pathname === '/api/feedback' && request.method === 'POST') {
      const body = validateFeedback(await request.json().catch(() => null))
      if (!body) return json({ error: 'bad_request' }, 400)
      await saveFeedback(kv, device, body, deps.now())
      return json({ ok: true })
    }

    if (url.pathname === '/api/usage' && request.method === 'GET') {
      return json({ quota: await getQuota(kv, device, limits, deps.now()), model: configOf(env).model })
    }

    if (url.pathname === '/api/tutor' && request.method === 'POST') {
      const body = validateBody(await request.json().catch(() => null))
      if (typeof body === 'string') return json({ error: 'bad_request', message: body }, 400)
      const check = await checkQuota(kv, device, limits, deps.now())
      if (!check.ok) return json({ error: 'quota', reason: check.reason, quota: await getQuota(kv, device, limits, deps.now()) }, 429)

      try {
        const result = await callTutor(deps.client(env), configOf(env), body)
        const tokens = result.usage.inputTokens + result.usage.outputTokens + result.usage.cacheReadTokens + result.usage.cacheWriteTokens
        const costUsd = estimateCost(result.usage, pricesOf(env))
        await recordUsage(kv, device, { requests: 1, tokens, costUsd }, deps.now())
        return json({
          ...result.reply,
          raw: result.raw,
          model: result.model,
          usage: { tokens, costUsd },
          quota: await getQuota(kv, device, limits, deps.now()),
        })
      } catch (error) {
        if (error instanceof TutorRefusal) return json({ error: 'refusal' }, 422)
        if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 503)
        if (error instanceof Anthropic.APIError) return json({ error: 'upstream', status: error.status }, 502)
        if (error instanceof SyntaxError) return json({ error: 'bad_reply' }, 502)
        throw error
      }
    }
    return json({ error: 'not_found' }, 404)
  }
}

const handle = createHandler({
  client: (env) => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
  now: () => Date.now(),
  kv: (env) => env.USAGE as unknown as ListableKV,
})

export default { fetch: handle } satisfies ExportedHandler<Env>
