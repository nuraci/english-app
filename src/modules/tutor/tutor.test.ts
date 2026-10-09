import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../core/db/db'
import { updateSettings } from '../../core/db/settings'
import { fetchUsage, sendTurn, TutorError, tutorErrorMessage } from './client'
import { errorsToSrs, matchError } from './srs'
import { historyFor, saveTutorSummary, tutorHistory } from './storage'

describe('errori del tutor → ripasso', () => {
  it('collega verbi (anche dalle forme passate), termini tecnici e -teen/-ty', () => {
    expect(matchError({ category: 'irregular_verb', key: 'write' })).toMatchObject({
      itemId: 'verbs:write',
      module: 'verbs',
    })
    expect(matchError({ category: 'irregular_verb', key: 'wrote' })).toMatchObject({
      itemId: 'verbs:write',
    })
    expect(matchError({ category: 'vocabulary', key: 'Oscilloscope' })).toMatchObject({
      itemId: 'vocab:instruments:oscilloscope',
    })
    expect(matchError({ category: 'vocabulary', key: 'cache' })).toMatchObject({
      itemId: 'vocab:trap:cache',
    })
    expect(matchError({ category: 'number', key: '13' })).toMatchObject({
      itemId: 'numbers:L1:teen-ty',
    })
    expect(matchError({ category: 'number', key: '47' })).toBeNull()
    expect(matchError({ category: 'grammar', key: 'present perfect' })).toBeNull()
  })

  it('gli errori riconosciuti tornano subito da ripassare, senza doppioni', async () => {
    const now = new Date('2026-10-09T10:00:00Z')
    const added = await errorsToSrs(
      [
        { category: 'irregular_verb', key: 'wrote' },
        { category: 'irregular_verb', key: 'written' },
        { category: 'grammar', key: 'articles' },
      ],
      now,
    )
    expect(added.map((a) => a.itemId)).toEqual(['verbs:write'])
    const item = await db.items.get('verbs:write')
    expect(item?.due).toBe(now.getTime())
  })
})

describe('client del tutor', () => {
  beforeEach(async () => {
    await updateSettings({ tutorUrl: 'https://tutor.example/', tutorCode: 'my-code', deviceId: '' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('manda codice e id del dispositivo (generato una volta sola)', async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ reply: 'Hi', quota: {} }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    await sendTurn({ mode: 'interview', messages: [{ role: 'user', content: '[start]' }] })
    await sendTurn({ mode: 'interview', messages: [{ role: 'user', content: '[start]' }] })
    const calls = fetch.mock.calls as unknown as [string, RequestInit][]
    expect(calls[0]?.[0]).toBe('https://tutor.example/api/tutor')
    const h1 = calls[0]?.[1].headers as Record<string, string>
    const h2 = calls[1]?.[1].headers as Record<string, string>
    expect(h1.Authorization).toBe('Bearer my-code')
    expect(h1['X-Device-Id']).toMatch(/^[0-9a-f-]{36}$/)
    expect(h2['X-Device-Id']).toBe(h1['X-Device-Id'])
  })

  it.each([
    [401, 'unauthorized'],
    [429, 'quota'],
    [422, 'refusal'],
    [503, 'busy'],
    [500, 'server'],
  ])('HTTP %i → %s con un messaggio gentile', async (status, code) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status })),
    )
    const err = await fetchUsage().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(TutorError)
    expect((err as TutorError).code).toBe(code)
    expect(tutorErrorMessage(code as TutorError['code'])).not.toMatch(/sbagliato/i)
  })

  it('senza configurazione non chiama la rete', async () => {
    await updateSettings({ tutorUrl: '', tutorCode: '' })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(fetchUsage()).rejects.toMatchObject({ code: 'not-configured' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('riepilogo della sessione', () => {
  it('si salva sul dispositivo e conta come sessione', async () => {
    await saveTutorSummary({
      mode: 'interview',
      startedAt: 1000,
      endedAt: 901000,
      summary: 'Ottimo lavoro!',
      corrections: [{ you_said: 'I have wrote', better: 'I have written', explanation_it: '…' }],
      transcript: [
        { role: 'assistant', text: 'Tell me about yourself.' },
        { role: 'user', text: 'I am a validation engineer.' },
        { role: 'user', text: 'I have wrote tests.' },
      ],
      addedToReview: [],
      costUsd: 0.05,
    })
    const [last] = await tutorHistory()
    expect(last).toMatchObject({ mode: 'interview', summary: 'Ottimo lavoro!' })
    expect(await db.sessions.where('module').equals('tutor').count()).toBe(1)
  })

  it('la storia per l’API usa il testo grezzo dei turni del tutor', () => {
    expect(
      historyFor([
        { role: 'user', text: '[start]' },
        { role: 'assistant', text: 'Hi', raw: '{"reply":"Hi"}' },
      ]),
    ).toEqual([
      { role: 'user', content: '[start]' },
      { role: 'assistant', content: '{"reply":"Hi"}' },
    ])
  })
})
