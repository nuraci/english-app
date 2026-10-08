import { describe, expect, it } from 'vitest'
import { createRng } from '../random'
import {
  classifyNumberError,
  compareNumeric,
  integerToOrdinalWords,
  integerToWords,
  numberStringToWords,
  numericKey,
  wordsToDigits,
} from '.'

describe('numero ↔ parole: andata e ritorno', () => {
  it('tutti gli interi da 0 a 10.000', () => {
    for (let n = 0; n <= 10_000; n++) {
      expect(numericKey(integerToWords(n)), `${n}`).toBe(String(n))
    }
  })

  it('numeri grandi a caso fino ai miliardi', () => {
    const rng = createRng(42)
    for (let i = 0; i < 2000; i++) {
      const n = Math.floor(rng() * 999_999_999_999)
      expect(numericKey(integerToWords(n)), `${n}`).toBe(String(n))
    }
  })

  it('ordinali da 1 a 1000', () => {
    for (let n = 1; n <= 1000; n++) {
      const key = numericKey(integerToOrdinalWords(n))
      expect(key.replace(/(st|nd|rd|th)$/, ''), `${n}`).toBe(String(n))
    }
  })

  it('decimali e negativi', () => {
    const rng = createRng(7)
    for (let i = 0; i < 500; i++) {
      const s = (rng() * 200 - 100).toFixed(Math.floor(rng() * 4))
      const canonical = s.replace(/^-0(\.0*)?$/, '0$1')
      expect(numericKey(numberStringToWords(s)), s).toBe(numericKey(canonical))
    }
  })
})

describe('wordsToDigits', () => {
  it.each([
    ['forty-seven', '47'],
    ['one hundred and five', '105'],
    ['a thousand', '1000'],
    ['nineteen eighty-four', '19 84'],
    ['twenty twenty-six', '20 26'],
    ['two thousand five', '2005'],
    ['four zero zero zero', '4 0 0 0'],
    ['oh one six one', '0 1 6 1'],
    ['double five seven', '5 5 7'],
    ['three point three volts', '3 . 3 volts'],
    ['minus forty', '- 40'],
    ['twenty-first of March', '21st of march'],
    ['the third', 'the 3rd'],
    ['fifteen hundred', '1500'],
  ])('%s → %s', (input, out) => {
    expect(wordsToDigits(input)).toBe(out)
  })
})

describe('numericKey', () => {
  it.each([
    ['47 kΩ', '47 kilo-ohms', 'forty-seven kilo ohms', '47 kohm', '47K Ohms', '47 kilohms'],
    ['3.3 V', '3,3 V', 'three point three volts', '3.3v'],
    ['200 mVpp', '200 mV peak-to-peak', 'two hundred millivolts peak to peak'],
    ['16 MHz', 'sixteen megahertz', '16mhz'],
    ['4.7 µF', '4.7 uF', 'four point seven microfarads'],
    ['12 ns', 'twelve nanoseconds'],
    ['±5%', '+/- 5 %', 'plus or minus five percent', '+-5 per cent'],
    [
      '-40 °C to +125 °C',
      'from minus forty to plus one hundred twenty-five degrees Celsius',
      '-40 to +125 °C',
    ],
    ['1.8 V to 3.6 V', 'from one point eight to three point six volts', '1.8 to 3.6 V'],
    ['0x4000', 'zero x four zero zero zero', '0X4000'],
    ['0x1C', 'zero x one c', 'zero x one see'],
    ['3:45', '3:45'],
    ['quarter to 4', 'a quarter to four'],
    ['1,000,000', 'one million', '1000000'],
    ['01614960753', '0161 496 0753', 'oh one six one, four nine six, oh seven five three'],
    ['5577', 'double five double seven'],
    ['9:00', "nine o'clock", '9 o’clock'],
    ['1984', 'nineteen eighty-four'],
    ['21st', 'twenty-first'],
  ])('equivalenti: %s', (...forms) => {
    const keys = new Set(forms.map(numericKey))
    expect([...keys], forms.join(' | ')).toHaveLength(1)
  })

  it('distingue quantità diverse', () => {
    expect(numericKey('13')).not.toBe(numericKey('30'))
    expect(numericKey('47 kΩ')).not.toBe(numericKey('47 Ω'))
    expect(numericKey('3.3')).not.toBe(numericKey('33'))
    expect(numericKey('-40')).not.toBe(numericKey('40'))
  })
})

describe('classifyNumberError', () => {
  it.each([
    ['13', '30', 'teen-ty'],
    ['90', '19', 'teen-ty'],
    ['115', '150', 'teen-ty'],
    ['47 kΩ', '74 kΩ', 'digits'],
    ['47 kΩ', '47 MΩ', 'magnitude'],
    ['4700', '470', 'magnitude'],
    ['3.3', '33', 'decimal'],
    ['-40', '40', 'sign'],
    ['16', '61', 'digits'],
    ['250', '7', 'other'],
  ])('atteso %s, scritto %s → %s', (expected, given, tag) => {
    expect(classifyNumberError(numericKey(expected), numericKey(given))).toBe(tag)
  })
})

describe('compareNumeric', () => {
  it('accetta qualsiasi forma equivalente', () => {
    expect(compareNumeric('47k ohm', ['47 kΩ'])).toMatchObject({ correct: true, kind: 'exact' })
  })

  it('l’errore -teen/-ty è "quasi" e viene etichettato', () => {
    const r = compareNumeric('30', ['13'])
    expect(r).toMatchObject({ correct: false, kind: 'close', errorTag: 'teen-ty' })
    expect(r.diffs).toEqual([{ got: '30', expected: '13' }])
  })

  it('risposta vuota', () => {
    expect(compareNumeric('  ', ['13'])).toMatchObject({ correct: false, kind: 'wrong', diffs: [] })
  })
})
