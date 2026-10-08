import { describe, expect, it } from 'vitest'
import { createEmptyCard } from 'ts-fsrs'
import { generateNumberItem, type NumberItem } from '../../content/generators/numbers'
import type { ItemRecord, ReviewRecord } from '../../core/db/db'
import { createRng } from '../../core/random'
import { buildFeedback, evaluate, itemIdOf } from '../../core/session'
import { numberLevels, parseSkillId, skillId } from './data'
import { numberExercise } from './exercises'
import { buildNumberSession, rateAt } from './session'
import { computeNumberStats, recommendedLevel, recurringErrors } from './stats'

const item = (over: Partial<NumberItem> = {}): NumberItem => ({
  level: 1,
  kind: 'teen-ty',
  display: '13',
  speak: 'thirteen',
  accepted: ['13'],
  ...over,
})

describe('esercizi di numeri', () => {
  it('ascolta e scrivi: legge da solo, confronto numerico, errore -teen/-ty con spiegazione mirata', () => {
    const ex = numberExercise(item(), 'listen', 0, 1.2)
    expect(ex.prompt).toMatchObject({ speak: 'thirteen', autoplay: true, rate: 1.2 })
    expect(itemIdOf(ex)).toBe('numbers:L1:teen-ty')
    expect(evaluate(ex, { kind: 'text', value: 'thirteen' }).correct).toBe(true)

    const wrong = evaluate(ex, { kind: 'text', value: '30' })
    expect(wrong).toMatchObject({ correct: false, kind: 'close', errorTag: 'teen-ty' })
    expect(buildFeedback(wrong)).toMatchObject({
      title: 'Quasi!',
      detail: 'Hai scritto «30», era «13».',
    })
    expect(ex.tips?.['teen-ty']).toContain('thir-TEEN')
  })

  it('leggi ad alta voce: vale qualsiasi trascrizione equivalente', () => {
    const ex = numberExercise(
      item({
        level: 5,
        kind: 'resistance',
        display: '47 kΩ',
        speak: 'forty-seven kilo-ohms',
        accepted: ['47 kΩ', '47k'],
      }),
      'read',
      0,
    )
    expect(ex.answer).toMatchObject({ mode: 'speak', match: 'number', fallback: 'selfgrade' })
    expect(ex.answer.accepted[0]).toBe('forty-seven kilo-ohms')
    for (const t of ['47 kilo ohms', '47k ohms', '47 kOhm', 'forty seven kilo ohms']) {
      expect(evaluate(ex, { kind: 'speech', transcripts: ['something else', t] }).correct, t).toBe(
        true,
      )
    }
  })

  it('le varianti generate sono risposte giuste per ogni livello', () => {
    const rng = createRng(11)
    for (const level of numberLevels) {
      for (const kind of level.kinds) {
        const it = generateNumberItem(level.level, kind, rng)
        const ex = numberExercise(it, 'listen', 0)
        expect(
          evaluate(ex, { kind: 'text', value: it.display }).correct,
          `${kind}: ${it.display}`,
        ).toBe(true)
        expect(
          evaluate(ex, { kind: 'text', value: it.speak }).correct,
          `${kind}: ${it.speak}`,
        ).toBe(true)
      }
    }
  })
})

const review = (
  itemId: string,
  correct: boolean,
  extra: Partial<ReviewRecord> = {},
  t = 0,
): ReviewRecord => ({
  itemId,
  module: 'numbers',
  rating: correct ? 3 : 1,
  correct,
  reviewedAt: 1_000_000 + t,
  ...extra,
})

describe('statistiche', () => {
  it('conta la precisione per livello e gli errori ricorrenti, con esempi', () => {
    const reviews = [
      ...Array.from({ length: 4 }, (_, i) =>
        review(
          skillId(1, 'teen-ty'),
          false,
          { errorTag: 'teen-ty', expected: '13', answer: '30' },
          i,
        ),
      ),
      review(
        skillId(3, 'decimal'),
        false,
        { errorTag: 'decimal', expected: '3.3', answer: '33' },
        10,
      ),
      review(skillId(1, 'tens'), true, {}, 11),
      review(skillId(1, 'tens'), false, { errorTag: 'other' }, 12),
    ]
    const stats = computeNumberStats(reviews)
    expect(stats.levels[0]).toMatchObject({ level: 1, answered: 6, correct: 1 })
    expect(stats.errors[0]).toMatchObject({ tag: 'teen-ty', count: 4 })
    expect(stats.errors[0]?.examples[0]).toEqual({ expected: '13', answer: '30' })
    expect(recurringErrors(stats).map((e) => e.tag)).toEqual(['teen-ty'])
    expect(stats.errors.map((e) => e.tag)).not.toContain('other')
  })

  it('livello consigliato: il primo da consolidare', () => {
    expect(recommendedLevel(computeNumberStats([]))).toBe(1)
    const good = Array.from({ length: 25 }, (_, i) => review(skillId(1, 'tens'), true, {}, i))
    expect(recommendedLevel(computeNumberStats(good))).toBe(2)
  })

  it('parseSkillId', () => {
    expect(parseSkillId('numbers:L5:time-unit')).toEqual({ level: 5, kind: 'time-unit' })
    expect(parseSkillId('verbs:go')).toBeUndefined()
  })
})

describe('sessione di numeri', () => {
  it('ogni livello è giocabile e copre tutti i suoi tipi', () => {
    for (const level of numberLevels) {
      const ex = buildNumberSession({
        level: level.level,
        speed: 'normal',
        rng: createRng(level.level),
      })
      expect(ex).toHaveLength(15)
      const kinds = new Set(ex.map((e) => parseSkillId(itemIdOf(e))?.kind))
      for (const k of level.kinds) expect(kinds.has(k), `L${level.level} ${k}`).toBe(true)
      expect(new Set(ex.map((e) => e.id)).size).toBe(15)
    }
  })

  it('allenamento mirato: solo esercizi sull’errore scelto', () => {
    const ex = buildNumberSession({ focus: 'teen-ty', speed: 'normal', rng: createRng(1) })
    expect(ex.every((e) => itemIdOf(e) === 'numbers:L1:teen-ty')).toBe(true)
  })

  it('sessione normale: una parte riprende gli errori ricorrenti', () => {
    const ex = buildNumberSession({
      level: 5,
      recurring: ['teen-ty'],
      speed: 'normal',
      rng: createRng(2),
    })
    expect(ex.filter((e) => itemIdOf(e) === 'numbers:L1:teen-ty')).toHaveLength(3)
  })

  it('le abilità scadute escono più spesso', () => {
    const now = new Date('2026-10-08T10:00:00Z')
    const dueSkill: ItemRecord = {
      id: skillId(2, 'date'),
      module: 'numbers',
      card: createEmptyCard(now),
      due: now.getTime() - 1,
      createdAt: 0,
    }
    let withDue = 0
    let without = 0
    for (let seed = 0; seed < 200; seed++) {
      const count = (skills: ItemRecord[]) =>
        buildNumberSession({ level: 2, skills, now, speed: 'normal', rng: createRng(seed) }).filter(
          (e) => itemIdOf(e) === dueSkill.id,
        ).length
      withDue += count([dueSkill])
      without += count([])
    }
    expect(withDue).toBeGreaterThan(without)
  })

  it('velocità crescente da 0.9× a 1.35×', () => {
    expect(rateAt(0, 15, 'ramp')).toBe(0.9)
    expect(rateAt(14, 15, 'ramp')).toBe(1.35)
    expect(rateAt(7, 15, 'normal')).toBe(1)
    const ex = buildNumberSession({ level: 1, speed: 'ramp', rng: createRng(3) })
    const listenRates = ex.map((e) => e.prompt.rate).filter((r): r is number => r !== undefined)
    expect(Math.max(...listenRates)).toBeGreaterThan(Math.min(...listenRates))
  })
})
