import { describe, expect, it } from 'vitest'
import { alignChars, compareSpelling, spokenToChars } from '.'

describe('spokenToChars', () => {
  it.each([
    ['ess tee em three two aitch seven four three', 'STM32H743'],
    ['S T M 32 H 743', 'STM32H743'],
    ['eye two see', 'I2C'],
    ['E S P 32 dash S 3', 'ESP32-S3'],
    ['double you', 'W'],
    ['double five', '55'],
    ['R double S', 'RSS'],
    ['S as in Sierra, T for Tango', 'ST'],
    ['Sierra Tango Mike', 'STM'],
    ['g dot russo at example dot com', 'G.RUSSO@EXAMPLE.COM'],
    ['mario underscore rossi', 'MARIO_ROSSI'],
    ['zed', 'Z'],
    ['em oh ar ee double tee eye', 'MORETTI'],
    ['double oh seven', 'OO7'],
    ['one zero', '10'],
    ['zee', 'Z'],
    ['why', 'Y'],
    ['cue', 'Q'],
    ['jay', 'J'],
  ])('%s → %s', (spoken, chars) => {
    expect(spokenToChars(spoken)).toBe(chars)
  })
})

describe('alignChars', () => {
  it('evidenzia scambi, lettere mancanti e in più', () => {
    expect(alignChars('STM32H734', 'STM32H743').filter((o) => o.op !== 'ok')).toHaveLength(2)
    expect(alignChars('LPC55S9', 'LPC55S69')).toContainEqual({ op: 'missing', expected: '6' })
    expect(alignChars('JTAGG', 'JTAG')).toContainEqual({ op: 'extra', got: 'G' })
    expect(alignChars('ESP', 'ASP')[0]).toEqual({ op: 'sub', got: 'E', expected: 'A' })
  })
})

describe('compareSpelling', () => {
  const groups = {
    A: ['aei'],
    E: ['aei', 'ee'],
    I: ['aei'],
    G: ['gj', 'ee'],
    J: ['gj'],
    B: ['ee'],
    D: ['ee'],
  }

  it('maiuscole e spazi non contano; i trattini sono facoltativi solo se richiesto', () => {
    expect(compareSpelling('stm32h743', ['STM32H743']).correct).toBe(true)
    expect(compareSpelling('CANFD', ['CAN FD']).correct).toBe(true)
    expect(compareSpelling('ESP32S3', ['ESP32-S3'], { ignoreDash: true }).correct).toBe(true)
    expect(compareSpelling('marco.rossi@acme.com', ['marco-rossi@acme.com']).correct).toBe(false)
  })

  it('una lettera sbagliata: "quasi", con la confusione riconosciuta', () => {
    const r = compareSpelling('EPC55S69', ['LPC55S69'], { letterGroups: groups })
    expect(r).toMatchObject({ correct: false, kind: 'close' })
    expect(r.diffs).toEqual([{ got: 'E', expected: 'L' }])
    expect(r.errorTag).toBeUndefined()

    const trap = compareSpelling('E2C', ['I2C'], { letterGroups: groups })
    expect(trap.errorTag).toBe('aei')
    expect(compareSpelling('JPIO', ['GPIO'], { letterGroups: groups }).errorTag).toBe('gj')
  })

  it('a voce: nomi delle lettere, e O o zero valgono uguali', () => {
    expect(compareSpelling('ess pee eye', ['SPI'], { spoken: true }).correct).toBe(true)
    const r = compareSpelling('em kay six four eff en one em oh', ['MK64FN1M0'], { spoken: true })
    expect(r.correct).toBe(true)
    const o = compareSpelling('R zero M E O', ['ROMEO'], { spoken: true })
    expect(o.correct).toBe(true)
    // Nel feedback si vedono le lettere della soluzione, non gli zeri.
    expect(o.charOps.every((c) => c.op === 'ok')).toBe(true)
    expect(o.charOps.map((c) => (c.op === 'ok' ? c.char : '')).join('')).toBe('ROMEO')
  })

  it('risposte lontane o vuote', () => {
    expect(compareSpelling('XYZ', ['STM32H743']).kind).toBe('wrong')
    expect(compareSpelling('', ['SPI']).kind).toBe('wrong')
  })
})
