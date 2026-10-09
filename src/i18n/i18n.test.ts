import { describe, expect, it } from 'vitest'
import itMessages from './it.json'
import { DICTIONARIES, translate } from '.'

describe('traduzioni', () => {
  it('traduce, sostituisce le variabili e ricade sull’italiano', () => {
    expect(translate('it', 'nav.today')).toBe('Oggi')
    expect(translate('it', 'settings.with', { name: 'Claude' })).toBe('con Claude')
    expect(translate('xx', 'nav.progress')).toBe('Progressi')
  })

  it('ogni lingua ha solo chiavi che esistono in italiano', () => {
    const keys = new Set(Object.keys(itMessages))
    for (const [code, dict] of Object.entries(DICTIONARIES)) {
      for (const key of Object.keys(dict.messages))
        expect(keys.has(key), `${code}: ${key}`).toBe(true)
    }
  })
})
