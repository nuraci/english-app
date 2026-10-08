import { describe, expect, it } from 'vitest'
import { compareNumeric, numericKey } from '../../core/normalize'
import { createRng } from '../../core/random'
import numbersContent from '../numbers.json'
import {
  generateNumberItem,
  GENERATORS,
  quantityAccepted,
  speakDigits,
  speakHex,
  speakYear,
} from './numbers'

const levels = numbersContent.levels

describe('generatore di numeri', () => {
  it('7 livelli, ogni tipo ha un generatore e un suggerimento', () => {
    expect(levels).toHaveLength(7)
    for (const level of levels) {
      for (const kind of level.kinds) {
        expect(GENERATORS[kind], kind).toBeDefined()
        expect((numbersContent.kindTips as Record<string, string>)[kind], kind).toBeTruthy()
      }
    }
  })

  for (const level of levels) {
    for (const kind of level.kinds) {
      it(`L${level.level} ${kind}: quello che si sente e quello che si vede sono risposte giuste`, () => {
        const rng = createRng(level.level * 1000 + kind.length)
        const displays = new Set<string>()
        for (let i = 0; i < 300; i++) {
          const item = generateNumberItem(level.level, kind, rng)
          displays.add(item.display)
          const keys = new Set(item.accepted.map(numericKey))
          expect(
            keys.has(numericKey(item.speak)),
            `${item.speak} → ${numericKey(item.speak)} ∉ ${[...keys].join(' ')}`,
          ).toBe(true)
          expect(keys.has(numericKey(item.display)), item.display).toBe(true)
        }
        // Varianti "infinite": tante forme diverse anche in poche estrazioni.
        expect(displays.size, kind).toBeGreaterThan(kind === 'teen-ty' ? 10 : 15)
      })
    }
  }
})

describe('helper', () => {
  it('speakDigits usa oh, double e triple', () => {
    expect(speakDigits('0161')).toBe('oh one six one')
    expect(speakDigits('5557')).toBe('triple five seven')
    expect(speakDigits('4400')).toBe('double four double oh')
  })

  it('speakYear legge gli anni a coppie', () => {
    expect(speakYear(1984)).toBe('nineteen eighty-four')
    expect(speakYear(2005)).toBe('two thousand five')
    expect(speakYear(2026)).toBe('twenty twenty-six')
    expect(speakYear(1905)).toBe('nineteen oh five')
    expect(speakYear(1900)).toBe('nineteen hundred')
  })

  it('speakHex legge le lettere per nome', () => {
    expect(speakHex('1C')).toBe('zero x one see')
    expect(speakHex('4000')).toBe('zero x four zero zero zero')
  })

  it('misure: tutte le scritture comuni sono accettate', () => {
    const accepted = quantityAccepted({
      value: 4.7,
      prefix: 'k',
      unit: { sym: 'Ω', word: 'ohm', plural: 'ohms' },
    })
    for (const answer of ['4.7k', '4k7', '4700 ohm', '4,7 kΩ', '4.7 kilo-ohms', '4.7 kohm']) {
      expect(compareNumeric(answer, accepted).correct, answer).toBe(true)
    }
    expect(compareNumeric('47k', accepted).correct).toBe(false)
  })
})
