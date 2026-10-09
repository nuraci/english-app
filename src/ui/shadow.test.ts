import { describe, expect, it } from 'vitest'
import { repeatPauseMs, splitSentences } from './shadow'

describe('shadowing', () => {
  it('divide il testo in frasi', () => {
    expect(splitSentences('I am Mario. I test chips!\nWhy? Because I like it.')).toEqual([
      'I am Mario.',
      'I test chips!',
      'Why?',
      'Because I like it.',
    ])
  })
  it('la pausa cresce con la lunghezza della frase', () => {
    expect(repeatPauseMs('one two three')).toBeLessThan(
      repeatPauseMs('one two three four five six'),
    )
  })
})
