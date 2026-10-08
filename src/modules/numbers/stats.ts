import type { ReviewRecord } from '../../core/db/db'
import { numberLevels, parseSkillId } from './data'

export type LevelStats = {
  level: number
  answered: number
  correct: number
  accuracy: number | null
}

export type ErrorStat = {
  tag: string
  count: number
  /** Ultimi esempi: "13 → 30". */
  examples: { expected: string; answer: string }[]
}

export type NumberStats = { levels: LevelStats[]; errors: ErrorStat[] }

/** Quanti ripassi recenti considerare: gli errori vecchi non devono pesare per sempre. */
export const RECENT_REVIEWS = 200
/** Da quante volte un errore conta come "ricorrente". */
export const RECURRING_THRESHOLD = 3

/** Precisione per livello e errori ricorrenti, dai ripassi più recenti. */
export function computeNumberStats(reviews: readonly ReviewRecord[]): NumberStats {
  const recent = [...reviews].sort((a, b) => b.reviewedAt - a.reviewedAt).slice(0, RECENT_REVIEWS)

  const levels = numberLevels.map(({ level }) => {
    const mine = recent.filter((r) => parseSkillId(r.itemId)?.level === level)
    const correct = mine.filter((r) => r.correct).length
    return {
      level,
      answered: mine.length,
      correct,
      accuracy: mine.length ? correct / mine.length : null,
    }
  })

  const byTag = new Map<string, ErrorStat>()
  for (const r of recent) {
    if (r.correct || !r.errorTag || r.errorTag === 'other') continue
    const stat = byTag.get(r.errorTag) ?? { tag: r.errorTag, count: 0, examples: [] }
    stat.count++
    if (stat.examples.length < 3 && r.expected && r.answer) {
      stat.examples.push({ expected: r.expected, answer: r.answer })
    }
    byTag.set(r.errorTag, stat)
  }
  const errors = [...byTag.values()].sort((a, b) => b.count - a.count)
  return { levels, errors }
}

/** Gli errori abbastanza frequenti da meritare esercizi mirati. */
export function recurringErrors(stats: NumberStats): ErrorStat[] {
  return stats.errors.filter((e) => e.count >= RECURRING_THRESHOLD)
}

/** Livello consigliato: il primo non ancora provato abbastanza o sotto l'80% di risposte giuste. */
export function recommendedLevel(stats: NumberStats): number {
  const weak = stats.levels.find((l) => l.answered < 20 || (l.accuracy ?? 0) < 0.8)
  return weak?.level ?? (stats.levels.at(-1)?.level as number)
}
