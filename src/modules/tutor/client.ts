import { getSettings, updateSettings } from '../../core/db/settings'

export type Correction = { you_said: string; better: string; explanation_it: string }
export type TutorErrorItem = {
  category: 'irregular_verb' | 'vocabulary' | 'number' | 'grammar' | 'other'
  key: string
}
export type Quota = {
  requests: number
  tokens: number
  costUsd: number
  requestsLeft: number
  tokensLeft: number
}

export type TutorResponse = {
  reply: string
  corrections: Correction[]
  errors: TutorErrorItem[]
  interview_over: boolean
  summary_it: string
  /** Risposta grezza del modello, da rimandare tale e quale nella storia. */
  raw: string
  model: string
  usage: { tokens: number; costUsd: number }
  quota: Quota
}

export type TutorTurn = { role: 'user' | 'assistant'; content: string }

/** Turno d'apertura (non mostrato): l'API vuole che la conversazione inizi dall'utente. */
export const OPENERS = {
  interview: "[I'm ready. Please start the interview.]",
  conversation: '[Please start the conversation.]',
} as const

export type TutorPayload = {
  mode: 'interview' | 'conversation'
  topic?: string
  messages: TutorTurn[]
  elapsedMinutes?: number
  finish?: boolean
}

export type TutorErrorCode =
  'not-configured' | 'offline' | 'unauthorized' | 'quota' | 'refusal' | 'busy' | 'server'

export class TutorError extends Error {
  constructor(public readonly code: TutorErrorCode) {
    super(code)
  }
}

/** Messaggi gentili per ogni problema. */
export function tutorErrorMessage(code: TutorErrorCode): string {
  switch (code) {
    case 'not-configured':
      return 'Il tutor non è ancora configurato: inserisci indirizzo e codice nelle Impostazioni.'
    case 'offline':
      return 'Il tutor ha bisogno della rete. Tutto il resto dell’app funziona anche offline.'
    case 'unauthorized':
      return 'Il codice di accesso non è valido: controllalo nelle Impostazioni.'
    case 'quota':
      return 'Per oggi hai usato tutto il tempo con il tutor. Bel lavoro! Si riparte domani.'
    case 'refusal':
      return 'Il tutor non può rispondere a questo. Proviamo a riformulare o a cambiare argomento.'
    case 'busy':
      return 'Il tutor è molto richiesto in questo momento. Riprova tra qualche secondo.'
    case 'server':
      return 'Qualcosa non ha funzionato con il tutor. Riprova tra poco.'
  }
}

async function connection() {
  const settings = await getSettings()
  if (!settings.tutorUrl || !settings.tutorCode) throw new TutorError('not-configured')
  let deviceId = settings.deviceId
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    await updateSettings({ deviceId })
  }
  return {
    base: settings.tutorUrl.replace(/\/+$/, ''),
    headers: { Authorization: `Bearer ${settings.tutorCode}`, 'X-Device-Id': deviceId },
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { base, headers } = await connection()
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new TutorError('offline')
  let res: Response
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) },
    })
  } catch {
    throw new TutorError(
      typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'server',
    )
  }
  if (res.status === 401) throw new TutorError('unauthorized')
  if (res.status === 429) throw new TutorError('quota')
  if (res.status === 422) throw new TutorError('refusal')
  if (res.status === 503) throw new TutorError('busy')
  if (!res.ok) throw new TutorError('server')
  return (await res.json()) as T
}

export function sendTurn(payload: TutorPayload): Promise<TutorResponse> {
  return request<TutorResponse>('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function fetchUsage(): Promise<{ quota: Quota; model: string }> {
  return request('/api/usage')
}
