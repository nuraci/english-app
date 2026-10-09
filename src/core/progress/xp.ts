import type { AttemptRecord, ReviewRecord, SessionRecord } from '../db/db'
import { dayKey } from './days'

/** Punti: anche le risposte sbagliate valgono, perché conta l'impegno. */
export const XP = {
  correct: 10,
  wrong: 5,
  attempt: 20,
  session: 20,
  shadowingSentence: 2,
} as const

export const XP_PER_LEVEL = 500

export type ActivityData = {
  reviews: readonly Pick<ReviewRecord, 'correct' | 'reviewedAt' | 'module'>[]
  sessions: readonly Pick<SessionRecord, 'module' | 'startedAt' | 'endedAt' | 'total' | 'correct'>[]
  attempts: readonly Pick<AttemptRecord, 'createdAt'>[]
}

/** XP per giorno, calcolati da ripassi, risposte del colloquio e sessioni completate. */
export function xpByDay(data: ActivityData): Map<string, number> {
  const out = new Map<string, number>()
  const add = (time: number, xp: number) => {
    const key = dayKey(time)
    out.set(key, (out.get(key) ?? 0) + xp)
  }
  for (const r of data.reviews) add(r.reviewedAt, r.correct ? XP.correct : XP.wrong)
  for (const a of data.attempts) add(a.createdAt, XP.attempt)
  for (const s of data.sessions) {
    if (s.endedAt === undefined) continue
    add(s.endedAt, s.module === 'shadowing' ? s.total * XP.shadowingSentence : XP.session)
  }
  return out
}

/** I giorni in cui l'utente ha fatto qualcosa. */
export function activeDays(data: ActivityData): Set<string> {
  return new Set(xpByDay(data).keys())
}

export function levelOf(xp: number): { level: number; intoLevel: number; perLevel: number } {
  return {
    level: 1 + Math.floor(xp / XP_PER_LEVEL),
    intoLevel: xp % XP_PER_LEVEL,
    perLevel: XP_PER_LEVEL,
  }
}
