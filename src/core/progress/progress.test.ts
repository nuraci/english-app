import { describe, expect, it } from 'vitest'
import {
  activeDays,
  addDays,
  computeBadges,
  computeStreak,
  dayKey,
  levelOf,
  weekProgress,
  weekStart,
  xpByDay,
} from '.'

const at = (key: string, hour = 10) =>
  new Date(`${key}T${String(hour).padStart(2, '0')}:00:00`).getTime()

describe('giorni', () => {
  it('chiavi in ora locale, somme e settimane da lunedì', () => {
    expect(dayKey(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(weekStart('2026-10-09')).toBe('2026-10-05') // venerdì → lunedì
    expect(weekStart('2026-10-11')).toBe('2026-10-05') // domenica → lunedì
    expect(weekStart('2026-10-05')).toBe('2026-10-05')
  })
})

describe('serie con jolly', () => {
  const set = (...days: string[]) => new Set(days)

  it('conta i giorni consecutivi; oggi non ancora fatto non interrompe', () => {
    expect(
      computeStreak(set('2026-10-01', '2026-10-02', '2026-10-03'), '2026-10-03'),
    ).toMatchObject({ current: 3, best: 3, todayDone: true })
    expect(computeStreak(set('2026-10-01', '2026-10-02'), '2026-10-03')).toMatchObject({
      current: 2,
      todayDone: false,
    })
  })

  it('un giorno saltato usa il jolly e la serie continua', () => {
    const s = computeStreak(
      set('2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05'),
      '2026-10-05',
    )
    expect(s).toMatchObject({ current: 4, jolliesLeft: 0, jollyDays: ['2026-10-03'] })
  })

  it('senza jolly la serie riparte, con dolcezza: il record resta', () => {
    const s = computeStreak(
      set('2026-10-01', '2026-10-02', '2026-10-04', '2026-10-06', '2026-10-07'),
      '2026-10-07',
    )
    expect(s).toMatchObject({ current: 2, best: 3, jollyDays: ['2026-10-03'] })
  })

  it('si guadagna un jolly ogni 7 giorni attivi, al massimo 2', () => {
    const days = Array.from({ length: 21 }, (_, i) => addDays('2026-09-01', i))
    expect(computeStreak(new Set(days), days.at(-1) as string).jolliesLeft).toBe(2)
    const s = computeStreak(new Set([...days, '2026-09-24']), '2026-09-24')
    expect(s).toMatchObject({
      current: 22,
      jollyDays: ['2026-09-22', '2026-09-23'],
      jolliesLeft: 0,
    })
  })

  it('nessuna attività', () => {
    expect(computeStreak(new Set(), '2026-10-09')).toEqual({
      current: 0,
      best: 0,
      jolliesLeft: 1,
      jollyDays: [],
      todayDone: false,
    })
  })

  it('obiettivo settimanale: giorni attivi da lunedì', () => {
    expect(weekProgress(set('2026-10-04', '2026-10-05', '2026-10-07'), '2026-10-09').done).toBe(2)
  })
})

describe('XP e badge', () => {
  const data = {
    reviews: [
      { correct: true, reviewedAt: at('2026-10-08'), module: 'verbs' },
      { correct: false, reviewedAt: at('2026-10-08'), module: 'verbs' },
      { correct: true, reviewedAt: at('2026-10-09'), module: 'numbers' },
    ],
    sessions: [
      {
        module: 'numbers',
        startedAt: at('2026-10-09'),
        endedAt: at('2026-10-09', 11),
        total: 10,
        correct: 10,
      },
      {
        module: 'shadowing',
        startedAt: at('2026-10-09'),
        endedAt: at('2026-10-09', 12),
        total: 6,
        correct: 6,
      },
      { module: 'verbs', startedAt: at('2026-10-07'), total: 5, correct: 3 }, // mai finita: niente bonus
    ],
    attempts: [{ createdAt: at('2026-10-09') }],
  }

  it('XP per giorno: anche gli errori valgono qualcosa', () => {
    const xp = xpByDay(data)
    expect(xp.get('2026-10-08')).toBe(15)
    expect(xp.get('2026-10-09')).toBe(10 + 20 + 12 + 20)
    expect([...activeDays(data)].sort()).toEqual(['2026-10-08', '2026-10-09'])
    expect(levelOf(1234)).toEqual({ level: 3, intoLevel: 234, perLevel: 500 })
  })

  it('badge guadagnati e da guadagnare', () => {
    const badges = computeBadges({
      ...data,
      bestStreak: 3,
      totalXp: 77,
      weekGoalReached: false,
      verbsSeen: 12,
    })
    const earned = badges.filter((b) => b.earned).map((b) => b.id)
    expect(earned).toEqual(['first-step', 'streak-3', 'numbers-perfect'])
    expect(badges.find((b) => b.id === 'first-interview')?.earned).toBe(false)
  })
})
