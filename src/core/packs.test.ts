import { describe, expect, it } from 'vitest'
import { activePacksOf, packs } from './packs'

describe('pacchetti di contenuti', () => {
  it('il base è sempre attivo; gli altri solo se scelti ed esistenti', () => {
    expect(packs.map((p) => p.id)).toEqual(['semiconductors', 'embedded-iot'])
    expect(activePacksOf([])).toEqual(['semiconductors'])
    expect(activePacksOf(['embedded-iot', 'inesistente'])).toEqual([
      'semiconductors',
      'embedded-iot',
    ])
  })
})
