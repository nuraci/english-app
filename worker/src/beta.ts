import type { KV } from './quota'

/** KV con elenco delle chiavi (serve solo all'esportazione per l'amministratore). */
export type ListableKV = KV & {
  list(options: { prefix: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>
}

const FEEDBACK_TTL = 180 * 24 * 60 * 60
const WAITLIST_PER_IP_PER_DAY = 5

export type FeedbackBody = { text: string; page: string; version: string }

export function validateFeedback(body: unknown): FeedbackBody | null {
  const b = body as Record<string, unknown> | null
  if (!b || typeof b.text !== 'string' || !b.text.trim() || b.text.length > 4000) return null
  return {
    text: b.text.trim(),
    page: typeof b.page === 'string' ? b.page.slice(0, 60) : '',
    version: typeof b.version === 'string' ? b.version.slice(0, 20) : '',
  }
}

export async function saveFeedback(kv: KV, device: string, body: FeedbackBody, now: number): Promise<void> {
  const key = `feedback:${new Date(now).toISOString()}:${crypto.randomUUID().slice(0, 8)}`
  await kv.put(key, JSON.stringify({ ...body, device, at: now }), { expirationTtl: FEEDBACK_TTL })
}

export type WaitlistBody = { email: string; consent: true; role?: string }

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/

export function validateWaitlist(body: unknown): WaitlistBody | null {
  const b = body as Record<string, unknown> | null
  if (!b || typeof b.email !== 'string' || !EMAIL.test(b.email.trim()) || b.consent !== true) return null
  return {
    email: b.email.trim().toLowerCase(),
    consent: true,
    role: typeof b.role === 'string' ? b.role.slice(0, 80) : undefined,
  }
}

/** Iscrizione alla lista d'attesa: idempotente per email, limitata per indirizzo IP. */
export async function joinWaitlist(kv: KV, ip: string, body: WaitlistBody, now: number): Promise<'ok' | 'limit'> {
  const day = new Date(now).toISOString().slice(0, 10)
  const ipKey = `waitlist-ip:${ip}:${day}`
  const count = Number((await kv.get(ipKey)) ?? '0')
  if (count >= WAITLIST_PER_IP_PER_DAY) return 'limit'
  await kv.put(ipKey, String(count + 1), { expirationTtl: 2 * 24 * 60 * 60 })
  // Si conservano solo email, ruolo, data e consenso: niente altro.
  await kv.put(`waitlist:${body.email}`, JSON.stringify({ email: body.email, role: body.role ?? '', consent: true, at: now }))
  return 'ok'
}

export async function exportPrefix(kv: ListableKV, prefix: string): Promise<unknown[]> {
  const out: unknown[] = []
  let cursor: string | undefined
  do {
    const page = await kv.list({ prefix, cursor })
    for (const { name } of page.keys) {
      const value = await kv.get(name)
      if (value) out.push(JSON.parse(value))
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return out
}
