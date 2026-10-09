import { describe, expect, it } from 'vitest'
import { createRng } from '../../core/random'
import { evaluate, itemIdOf } from '../../core/session'
import { buildLevelTest, scoreLevelTest } from './levelTest'

describe('test di livello', () => {
  it('16 esercizi in 4 aree, tutti diversi', () => {
    const ex = buildLevelTest(createRng(1), 'en-GB')
    expect(ex).toHaveLength(16)
    const modules = ex.map((e) => itemIdOf(e).split(':')[0])
    expect(modules.filter((m) => m === 'verbs')).toHaveLength(4)
    expect(modules.filter((m) => m === 'numbers')).toHaveLength(5)
    expect(modules.filter((m) => m === 'spelling')).toHaveLength(3)
    expect(modules.filter((m) => m === 'vocab')).toHaveLength(4)
    expect(new Set(ex.map((e) => e.id)).size).toBe(16)
  })

  it('punteggio per area, livello indicativo e consigli', () => {
    const ex = buildLevelTest(createRng(2), 'en-US')
    // Tutto giusto tranne i numeri.
    const results = ex.map((e) => {
      const area = itemIdOf(e).split(':')[0]
      const value = area === 'numbers' ? 'boh' : (e.answer.accepted[0] as string)
      return { exerciseId: e.id, evaluation: evaluate(e, { kind: 'text', value }) }
    })
    const r = scoreLevelTest(results)
    expect(r.areas.verbs).toMatchObject({ correct: 4, total: 4, label: 'Solido' })
    expect(r.areas.numbers).toMatchObject({ correct: 0, total: 5, label: 'Da costruire' })
    expect(r.overall).toBe('B1')
    expect(r.numbersStartLevel).toBe(1)
    expect(r.recommendations[1]).toContain('numeri in ascolto')
    expect(r.recommendations.join(' ')).not.toMatch(/sbagliat|scarso|male/i)
  })

  it('tutto giusto → B2, numeri dal livello 3', () => {
    const ex = buildLevelTest(createRng(3), 'en-US')
    const r = scoreLevelTest(
      ex.map((e) => ({
        exerciseId: e.id,
        evaluation: evaluate(e, { kind: 'text', value: e.answer.accepted[0] as string }),
      })),
    )
    expect(r.overall).toBe('B2')
    expect(r.numbersStartLevel).toBe(3)
  })
})
