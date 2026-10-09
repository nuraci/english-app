import { describe, expect, it } from 'vitest'
import { hasAccess, isPremium, packs, usablePacks } from './plan'

describe('piano freemium (predisposizione)', () => {
  it('base gratis; tutor e pacchetti di settore premium', () => {
    expect(packs.map((p) => p.id)).toEqual(['semiconductors', 'embedded-iot'])
    expect(isPremium('pack:semiconductors')).toBe(false)
    expect(isPremium('pack:embedded-iot')).toBe(true)
    expect(isPremium('tutor')).toBe(true)
  })

  it('in beta è tutto sbloccato; con il piano gratuito solo il base', () => {
    expect(hasAccess('tutor', 'beta')).toBe(true)
    expect(hasAccess('tutor', 'free')).toBe(false)
    expect(usablePacks(['embedded-iot'], 'beta')).toEqual(['semiconductors', 'embedded-iot'])
    expect(usablePacks(['embedded-iot'], 'free')).toEqual(['semiconductors'])
    expect(usablePacks([], 'premium')).toEqual(['semiconductors'])
  })
})
