import { describe, expect, it } from 'vitest'
import { buildDailyPlan, type PlanInput } from './plan'

const base: PlanInput = {
  due: {},
  numbersErrors: [],
  spellingTraps: [],
  numbersLevel: 1,
  vocabDeck: { id: 'instruments', name: 'Strumenti', due: 0 },
  hasMyAnswers: false,
  doneToday: new Set(),
  dayNumber: 0,
}

describe('piano di oggi', () => {
  it('tre blocchi da 10 minuti: lacune, ascolto, parlato', () => {
    const plan = buildDailyPlan(base)
    expect(plan.map((b) => [b.id, b.minutes])).toEqual([
      ['gaps', 10],
      ['listening', 10],
      ['speaking', 10],
    ])
    expect(plan.every((b) => b.to.startsWith('/allenamenti/') && b.reason)).toBe(true)
  })

  it('le lacune puntano al punto più debole', () => {
    expect(buildDailyPlan({ ...base, due: { verbs: 12 } })[0]).toMatchObject({
      module: 'verbs',
      reason: expect.stringContaining('12 verbi'),
    })
    const numbers = buildDailyPlan({ ...base, due: { verbs: 3 }, numbersErrors: ['teen-ty'] })[0]
    expect(numbers).toMatchObject({
      module: 'numbers',
      to: '/allenamenti/numeri/sessione?focus=teen-ty',
    })
    expect(buildDailyPlan({ ...base, spellingTraps: ['aei'] })[0]).toMatchObject({
      module: 'spelling',
      to: expect.stringContaining('alphabet'),
    })
  })

  it('senza urgenze, le lacune si alternano giorno per giorno', () => {
    const modules = [0, 1, 2].map((d) => buildDailyPlan({ ...base, dayNumber: d })[0]?.module)
    expect(new Set(modules).size).toBe(3)
  })

  it('l’ascolto non ripete il modulo delle lacune e usa i sottotitoli importati', () => {
    for (let d = 0; d < 6; d++) {
      const [gaps, listening] = buildDailyPlan({ ...base, dayNumber: d })
      expect(listening?.module).not.toBe(gaps?.module)
    }
    const withSrt = buildDailyPlan({
      ...base,
      subtitlesSource: { id: 'srt-1', name: 'IT Crowd' },
      dayNumber: 3,
      due: { verbs: 5 },
    })
    expect(withSrt[1]?.to).toContain('srt-1')
  })

  it('i blocchi già fatti oggi sono spuntati', () => {
    const plan = buildDailyPlan({ ...base, due: { verbs: 5 }, doneToday: new Set(['verbs']) })
    expect(plan[0]?.done).toBe(true)
    expect(plan[2]?.done).toBe(false)
  })

  it('il parlato dà priorità ai termini da ripassare', () => {
    expect(
      buildDailyPlan({
        ...base,
        vocabDeck: { id: 'firmware', name: 'Firmware', due: 4 },
        dayNumber: 2,
      })[2]?.to,
    ).toContain('deck=firmware')
  })
})
