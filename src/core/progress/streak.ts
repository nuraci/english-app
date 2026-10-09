import { addDays, daysBetween, weekStart } from './days'

export const MAX_JOLLIES = 2
/** Ogni 7 giorni di attività si guadagna un jolly. */
export const DAYS_PER_JOLLY = 7

export type Streak = {
  /** Giorni consecutivi di attività (i giorni coperti da jolly non contano ma non interrompono). */
  current: number
  best: number
  jolliesLeft: number
  /** Giorni saltati coperti da un jolly. */
  jollyDays: string[]
  todayDone: boolean
}

/**
 * Serie di giorni consecutivi con jolly automatici: se salti un giorno e hai un jolly, la serie
 * continua (niente sensi di colpa). Si parte con un jolly e se ne guadagna uno ogni 7 giorni attivi,
 * fino a un massimo di 2. Oggi non conta come saltato finché non è finito.
 */
export function computeStreak(active: ReadonlySet<string>, today: string): Streak {
  const sorted = [...active].filter((d) => d <= today).sort()
  const first = sorted[0]
  if (!first) return { current: 0, best: 0, jolliesLeft: 1, jollyDays: [], todayDone: false }

  let current = 0
  let best = 0
  let jollies = 1
  let activeCount = 0
  const jollyDays: string[] = []
  for (const day of daysBetween(first, today)) {
    if (active.has(day)) {
      current++
      best = Math.max(best, current)
      activeCount++
      if (activeCount % DAYS_PER_JOLLY === 0) jollies = Math.min(MAX_JOLLIES, jollies + 1)
    } else if (day !== today) {
      if (current > 0 && jollies > 0) {
        jollies--
        jollyDays.push(day)
      } else {
        current = 0
      }
    }
  }
  return { current, best, jolliesLeft: jollies, jollyDays, todayDone: active.has(today) }
}

/** Giorni attivi nella settimana in corso (da lunedì). */
export function weekProgress(
  active: ReadonlySet<string>,
  today: string,
): { done: number; days: string[] } {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i))
  return { done: days.filter((d) => active.has(d)).length, days }
}
