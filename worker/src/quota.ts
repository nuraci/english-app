/** Contatori giornalieri per dispositivo e totali, salvati in Workers KV. */

/** Il minimo di Workers KV che serve: leggere e scrivere stringhe. */
export type KV = {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

export type Counters = { requests: number; tokens: number; costUsd: number }

export type Limits = { requestsPerDay: number; tokensPerDay: number; costCapUsdPerDay: number }

export type Quota = Counters & { limits: Limits; requestsLeft: number; tokensLeft: number }

const EMPTY: Counters = { requests: 0, tokens: 0, costUsd: 0 }
const TTL_SECONDS = 2 * 24 * 60 * 60

export const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10)

async function read(kv: KV, key: string): Promise<Counters> {
  const value = await kv.get(key)
  return value ? { ...EMPTY, ...(JSON.parse(value) as Counters) } : { ...EMPTY }
}

export async function getQuota(kv: KV, device: string, limits: Limits, now: number): Promise<Quota> {
  const mine = await read(kv, `usage:${device}:${dayOf(now)}`)
  return {
    ...mine,
    limits,
    requestsLeft: Math.max(0, limits.requestsPerDay - mine.requests),
    tokensLeft: Math.max(0, limits.tokensPerDay - mine.tokens),
  }
}

export type QuotaCheck = { ok: true } | { ok: false; reason: 'device' | 'global' }

/** Prima della chiamata: c'è ancora spazio nei limiti del dispositivo e nel tetto di spesa totale? */
export async function checkQuota(kv: KV, device: string, limits: Limits, now: number): Promise<QuotaCheck> {
  const day = dayOf(now)
  const [mine, all] = await Promise.all([read(kv, `usage:${device}:${day}`), read(kv, `usage:all:${day}`)])
  if (mine.requests >= limits.requestsPerDay || mine.tokens >= limits.tokensPerDay) return { ok: false, reason: 'device' }
  if (all.costUsd >= limits.costCapUsdPerDay) return { ok: false, reason: 'global' }
  return { ok: true }
}

/** Dopo la chiamata: aggiunge richieste, token e costo stimato. */
export async function recordUsage(kv: KV, device: string, delta: Counters, now: number): Promise<void> {
  const day = dayOf(now)
  for (const key of [`usage:${device}:${day}`, `usage:all:${day}`]) {
    const current = await read(kv, key)
    const next: Counters = {
      requests: current.requests + delta.requests,
      tokens: current.tokens + delta.tokens,
      costUsd: Number((current.costUsd + delta.costUsd).toFixed(6)),
    }
    await kv.put(key, JSON.stringify(next), { expirationTtl: TTL_SECONDS })
  }
}

export type Prices = { inputPerMTok: number; outputPerMTok: number }

/** Costo stimato: letture dalla cache a 0,1× e scritture a 1,25× il prezzo di input. */
export function estimateCost(
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number },
  prices: Prices,
): number {
  const input = usage.inputTokens + usage.cacheReadTokens * 0.1 + usage.cacheWriteTokens * 1.25
  return (input * prices.inputPerMTok + usage.outputTokens * prices.outputPerMTok) / 1_000_000
}
