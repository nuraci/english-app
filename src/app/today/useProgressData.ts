import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  type AttemptRecord,
  type ItemRecord,
  type ReviewRecord,
  type SessionRecord,
} from '../../core/db/db'
import { getSettings } from '../../core/db/settings'
import {
  activeDays,
  computeBadges,
  computeStreak,
  dayKey,
  levelOf,
  weekProgress,
  xpByDay,
  type Badge,
  type Streak,
} from '../../core/progress'
import { MODULE as NUMBERS, numberLevels } from '../../modules/numbers/data'
import { computeNumberStats, recommendedLevel, recurringErrors } from '../../modules/numbers/stats'
import { computeTrapStats } from '../../modules/spelling/stats'
import { MODULE as VERBS } from '../../modules/verbs/data'
import { activePacksOf } from '../../core/packs'
import { decksFor, termItemId } from '../../modules/vocab/data'
import { buildDailyPlan, type PlanBlock } from './plan'

export type ProgressData = {
  today: string
  reviews: ReviewRecord[]
  sessions: SessionRecord[]
  attempts: AttemptRecord[]
  items: ItemRecord[]
  xp: Map<string, number>
  totalXp: number
  level: ReturnType<typeof levelOf>
  active: Set<string>
  streak: Streak
  week: { done: number; days: string[]; goal: number }
  badges: Badge[]
  plan: PlanBlock[]
  subtitles?: { id: string; name: string }
}

/** Tutto quello che serve alle schermate Oggi e Progressi, ricalcolato quando cambiano i dati. */
export async function loadProgressData(now = Date.now()): Promise<ProgressData> {
  const [reviews, sessions, attempts, items, texts, settings] = await Promise.all([
    db.reviews.toArray(),
    db.sessions.toArray(),
    db.attempts.toArray(),
    db.items.toArray(),
    db.userTexts.where('kind').anyOf(['subtitles', 'interview-answer']).toArray(),
    getSettings(),
  ])
  const today = dayKey(now)
  const data = { reviews, sessions, attempts }
  const xp = xpByDay(data)
  const totalXp = [...xp.values()].reduce((a, b) => a + b, 0)
  const active = activeDays(data)
  const streak = computeStreak(active, today)
  const week = { ...weekProgress(active, today), goal: settings.weeklyGoalDays }

  const due: Record<string, number> = {}
  for (const i of items) if (i.due <= now) due[i.module] = (due[i.module] ?? 0) + 1

  const numberStats = computeNumberStats(reviews.filter((r) => r.module === NUMBERS))
  const spellingTraps = computeTrapStats(reviews.filter((r) => r.module === 'spelling')).map(
    (t) => t.tag,
  )
  const itemIds = new Map(items.map((i) => [i.id, i]))
  const vocabDecks = decksFor(activePacksOf(settings.activePacks)).map((d) => {
    const deckItems = d.terms.map((t) => itemIds.get(termItemId(d, t)))
    return {
      id: d.id,
      name: d.name,
      due: deckItems.filter((i) => i && i.due <= now).length,
      fresh: deckItems.filter((i) => !i).length,
    }
  })
  const vocabDeck = [...vocabDecks].sort((a, b) => b.due - a.due)[0]?.due
    ? ([...vocabDecks].sort((a, b) => b.due - a.due)[0] as (typeof vocabDecks)[number])
    : (vocabDecks.find((d) => d.fresh > 0) ?? (vocabDecks[0] as (typeof vocabDecks)[number]))

  const srt = texts.find((t) => t.kind === 'subtitles')
  const subtitles = srt?.id !== undefined ? { id: `srt-${srt.id}`, name: srt.title } : undefined
  const doneToday = new Set(
    sessions
      .filter((s) => s.endedAt !== undefined && dayKey(s.endedAt) === today)
      .map((s) => s.module),
  )
  const dayNumber = Math.floor(new Date(today).getTime() / 86_400_000)

  const plan = buildDailyPlan({
    due,
    numbersErrors: recurringErrors(numberStats).map((e) => e.tag),
    spellingTraps,
    numbersLevel: recommendedLevel(numberStats) ?? numberLevels[0]?.level ?? 1,
    vocabDeck,
    subtitlesSource: subtitles,
    hasMyAnswers: texts.some((t) => t.kind === 'interview-answer' && t.text.trim()),
    doneToday,
    dayNumber,
  })

  const verbsSeen = items.filter((i) => i.module === VERBS).length
  const badges = computeBadges({
    ...data,
    bestStreak: streak.best,
    totalXp,
    weekGoalReached: week.done >= week.goal,
    verbsSeen,
  })

  return {
    today,
    reviews,
    sessions,
    attempts,
    items,
    xp,
    totalXp,
    level: levelOf(totalXp),
    active,
    streak,
    week,
    badges,
    plan,
    subtitles,
  }
}

export function useProgressData(): ProgressData | undefined {
  return useLiveQuery(() => loadProgressData(), [])
}
