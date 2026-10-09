import type { ReviewRecord } from '../../core/db/db'

export type TrapStat = {
  tag: string
  count: number
  examples: { expected: string; answer: string }[]
}

export const RECENT_REVIEWS = 200
export const RECURRING_THRESHOLD = 2

/** Gruppi di lettere confuse più spesso negli ultimi ripassi, con qualche esempio. */
export function computeTrapStats(reviews: readonly ReviewRecord[]): TrapStat[] {
  const recent = [...reviews].sort((a, b) => b.reviewedAt - a.reviewedAt).slice(0, RECENT_REVIEWS)
  const byTag = new Map<string, TrapStat>()
  for (const r of recent) {
    if (r.correct || !r.errorTag) continue
    const stat = byTag.get(r.errorTag) ?? { tag: r.errorTag, count: 0, examples: [] }
    stat.count++
    if (stat.examples.length < 3 && r.expected && r.answer)
      stat.examples.push({ expected: r.expected, answer: r.answer })
    byTag.set(r.errorTag, stat)
  }
  return [...byTag.values()]
    .filter((s) => s.count >= RECURRING_THRESHOLD)
    .sort((a, b) => b.count - a.count)
}
