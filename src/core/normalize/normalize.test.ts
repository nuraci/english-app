import { describe, expect, it } from 'vitest'
import {
  compareAnswer,
  integerToOrdinalWords,
  integerToWords,
  levenshtein,
  normalize,
  numberStringToWords,
} from '.'

describe('integerToWords', () => {
  it.each([
    [0, 'zero'],
    [7, 'seven'],
    [13, 'thirteen'],
    [30, 'thirty'],
    [47, 'forty-seven'],
    [100, 'one hundred'],
    [105, 'one hundred five'],
    [999, 'nine hundred ninety-nine'],
    [1000, 'one thousand'],
    [2048, 'two thousand forty-eight'],
    [1_000_000, 'one million'],
    [16_000_000, 'sixteen million'],
    [1_234_567, 'one million two hundred thirty-four thousand five hundred sixty-seven'],
  ])('%i → %s', (n, words) => {
    expect(integerToWords(n)).toBe(words)
  })

  it('rifiuta numeri negativi o non interi', () => {
    expect(() => integerToWords(-1)).toThrow(RangeError)
    expect(() => integerToWords(1.5)).toThrow(RangeError)
  })
})

describe('integerToOrdinalWords', () => {
  it.each([
    [1, 'first'],
    [2, 'second'],
    [3, 'third'],
    [5, 'fifth'],
    [12, 'twelfth'],
    [20, 'twentieth'],
    [21, 'twenty-first'],
    [100, 'one hundredth'],
  ])('%i → %s', (n, words) => {
    expect(integerToOrdinalWords(n)).toBe(words)
  })
})

describe('numberStringToWords', () => {
  it.each([
    ['3.3', 'three point three'],
    ['-40', 'minus forty'],
    ['0.05', 'zero point zero five'],
    ['+5', 'plus five'],
  ])('%s → %s', (s, words) => {
    expect(numberStringToWords(s)).toBe(words)
  })
})

describe('normalize', () => {
  it.each([
    ['  Hello,   World! ', 'hello world'],
    ['forty-seven', 'forty seven'],
    ['47', 'forty seven'],
    ['47 Ω', 'forty seven ohm'],
    ['47 ohms', 'forty seven ohm'],
    ['3.3 V', 'three point three v'],
    ['±5%', 'plus or minus five percent'],
    ['-40 °C', 'minus forty degrees celsius'],
    ['1,000,000', 'one million'],
    ['one hundred and five', 'one hundred five'],
    ["I didn't", 'i did not'],
    ['I didn’t', 'i did not'],
    ["We can't", 'we cannot'],
    ["I'm here", 'i am here'],
    ['100 µA', 'one hundred micro a'],
  ])('%j → %j', (input, expected) => {
    expect(normalize(input)).toBe(expected)
  })

  it('non trasforma le cifre dentro i codici', () => {
    expect(normalize('STM32H743')).toBe('stm32h743')
    expect(normalize('0x4000')).toBe('0x4000')
    expect(normalize('ESP32-S3')).toBe('esp32 s3')
  })
})

describe('levenshtein', () => {
  it('conta le modifiche minime', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('same', 'same')).toBe(0)
  })
})

describe('compareAnswer', () => {
  it('accetta forme equivalenti', () => {
    expect(compareAnswer('Forty-seven', ['47'])).toMatchObject({ correct: true, kind: 'exact' })
    expect(compareAnswer('47 ohm', ['forty-seven ohms'])).toMatchObject({ correct: true })
    expect(compareAnswer('i didnt', ["I didn't"]).correct).toBe(true)
    expect(compareAnswer('it doesnt work', ['It does not work']).correct).toBe(true)
  })

  it('sceglie la risposta accettata più vicina', () => {
    const r = compareAnswer('gotten', ['got', 'gotten'])
    expect(r).toMatchObject({ correct: true, expected: 'gotten' })
  })

  it('tollera un refuso nelle parole lunghe', () => {
    const r = compareAnswer('oscilloscpe', ['oscilloscope'])
    expect(r).toMatchObject({ correct: true, kind: 'typo' })
    expect(r.diffs).toEqual([{ got: 'oscilloscpe', expected: 'oscilloscope' }])
  })

  it('non considera refuso un verbo corto sbagliato', () => {
    expect(compareAnswer('run', ['ran'])).toMatchObject({ correct: false, kind: 'close' })
  })

  it('non considera refuso un numero diverso', () => {
    const r = compareAnswer('thirty', ['thirteen'])
    expect(r.correct).toBe(false)
    expect(r.diffs).toEqual([{ got: 'thirty', expected: 'thirteen' }])
    expect(compareAnswer('sixth', ['sixty']).correct).toBe(false)
  })

  it('segnala le parole diverse in una frase', () => {
    const r = compareAnswer('Yesterday I run the regression', ['Yesterday I ran the regression'])
    expect(r.correct).toBe(false)
    expect(r.diffs).toEqual([{ got: 'run', expected: 'ran' }])
  })

  it('distingue risposte lontane', () => {
    expect(compareAnswer('banana', ['oscilloscope']).kind).toBe('wrong')
    expect(compareAnswer('', ['ran']).kind).toBe('wrong')
  })
})
