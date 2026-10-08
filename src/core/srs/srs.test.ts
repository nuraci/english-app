import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createEmptyCard, State } from 'ts-fsrs'
import { AppDatabase } from '../db/db'
import { ensureItems, getDueItems, Rating, recordReview, scheduleReview } from '.'

const DAY = 24 * 60 * 60 * 1000
const t0 = new Date('2026-10-01T09:00:00Z')
const at = (ms: number) => new Date(t0.getTime() + ms)

describe('scheduleReview', () => {
  it('una card nuova risposta bene passa in apprendimento con scadenza futura', () => {
    const card = scheduleReview(createEmptyCard(t0), Rating.Good, t0)
    expect(card.state).toBe(State.Learning)
    expect(card.due.getTime()).toBeGreaterThan(t0.getTime())
    expect(card.reps).toBe(1)
  })

  it('Easy allontana la scadenza più di Again', () => {
    const again = scheduleReview(createEmptyCard(t0), Rating.Again, t0)
    const easy = scheduleReview(createEmptyCard(t0), Rating.Easy, t0)
    expect(easy.due.getTime()).toBeGreaterThan(again.due.getTime())
  })

  it('gli intervalli crescono con ripassi corretti consecutivi', () => {
    let card = createEmptyCard(t0)
    let now = t0
    const intervals: number[] = []
    for (let i = 0; i < 5; i++) {
      card = scheduleReview(card, Rating.Good, now)
      intervals.push(card.due.getTime() - now.getTime())
      now = card.due
    }
    expect(card.state).toBe(State.Review)
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1] ?? 0)
    }
  })

  it('un errore su una card in ripasso conta un lapse', () => {
    let card = createEmptyCard(t0)
    let now = t0
    for (let i = 0; i < 4; i++) {
      card = scheduleReview(card, Rating.Good, now)
      now = card.due
    }
    const lapsed = scheduleReview(card, Rating.Again, now)
    expect(lapsed.lapses).toBe(1)
    expect(lapsed.state).toBe(State.Relearning)
  })
})

describe('database SRS', () => {
  let database: AppDatabase

  beforeEach(() => {
    database = new AppDatabase(`test-${crypto.randomUUID()}`)
  })

  afterEach(async () => {
    await database.delete()
  })

  it('ensureItems crea solo gli item mancanti', async () => {
    await ensureItems('verbs', ['verbs:go', 'verbs:run'], t0, database)
    await recordReview('verbs:go', 'verbs', Rating.Good, { correct: true, now: t0 }, database)
    const before = await database.items.get('verbs:go')
    await ensureItems('verbs', ['verbs:go', 'verbs:see'], at(DAY), database)
    expect(await database.items.count()).toBe(3)
    expect(await database.items.get('verbs:go')).toEqual(before)
  })

  it('getDueItems filtra per modulo, scadenza e limite, dal più scaduto', async () => {
    await ensureItems('verbs', ['verbs:a', 'verbs:b', 'verbs:c'], t0, database)
    await ensureItems('numbers', ['numbers:13'], t0, database)
    // verbs:b ripassato bene: esce dai dovuti per un po'
    await recordReview('verbs:b', 'verbs', Rating.Easy, { correct: true, now: t0 }, database)

    const due = await getDueItems('verbs', 10, at(1000), database)
    expect(due.map((i) => i.id).sort()).toEqual(['verbs:a', 'verbs:c'])

    expect(await getDueItems('verbs', 1, at(1000), database)).toHaveLength(1)
    expect(await getDueItems('numbers', 10, at(1000), database)).toHaveLength(1)

    const later = await getDueItems('verbs', 10, at(60 * DAY), database)
    expect(later.map((i) => i.id)).toContain('verbs:b')
    const dues = later.map((i) => i.due)
    expect(dues).toEqual([...dues].sort((a, b) => a - b))
  })

  it('recordReview salva il log e aggiorna la scadenza', async () => {
    await ensureItems('numbers', ['numbers:13'], t0, database)
    const updated = await recordReview(
      'numbers:13',
      'numbers',
      Rating.Again,
      { correct: false, answer: 'thirty', now: t0 },
      database,
    )
    expect(updated.due).toBe(updated.card.due.getTime())
    const reviews = await database.reviews.where('itemId').equals('numbers:13').toArray()
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({ correct: false, answer: 'thirty', rating: Rating.Again })
  })

  it('recordReview crea l’item se non esiste', async () => {
    await recordReview('vocab:probe', 'vocab', Rating.Good, { correct: true, now: t0 }, database)
    expect(await database.items.get('vocab:probe')).toBeDefined()
  })
})
