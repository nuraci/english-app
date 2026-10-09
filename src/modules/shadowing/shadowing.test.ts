import { describe, expect, it } from 'vitest'
import { buildAutoSegments, DEFAULT_AUTO } from './auto'
import { builtInSources } from './sources'
import { deleteSubtitles, saveSubtitles, userSources } from './storage'

describe('sorgenti', () => {
  it('frasi dei moduli, tutte non vuote; i verbi senza graffe', () => {
    const sources = builtInSources(1)
    expect(sources.map((s) => s.id)).toEqual([
      'lifesavers',
      'ask',
      'questions',
      'verbs',
      'vocab',
      'samples',
    ])
    for (const s of sources) {
      expect(s.items.length, s.id).toBeGreaterThan(5)
      for (const i of s.items) expect(i.text.trim(), s.id).toBeTruthy()
    }
    const verbs = sources.find((s) => s.id === 'verbs')
    expect(verbs?.items.every((i) => !/[{}]/.test(i.text) && i.translation)).toBe(true)
  })

  it('sottotitoli importati e risposte dell’utente', async () => {
    const id = await saveSubtitles('The IT Crowd 1x01', [
      'Have you tried turning it off and on again?',
      'Hello, IT.',
    ])
    const mine = await userSources()
    const srt = mine.find((s) => s.id === `srt-${id}`)
    expect(srt).toMatchObject({ name: 'The IT Crowd 1x01' })
    expect(srt?.items).toHaveLength(2)
    await deleteSubtitles(id)
    expect((await userSources()).find((s) => s.id === `srt-${id}`)).toBeUndefined()
  })
})

describe('modalità auto', () => {
  const items = [
    {
      text: 'Could you repeat the question, please?',
      translation: 'Può ripetere la domanda, per favore?',
    },
    { text: 'Let me think.' },
  ]

  it('frase → pausa (in silenzio) → ripetizione → traduzione → stacco', () => {
    const seg = buildAutoSegments(items, DEFAULT_AUTO)
    const first = seg.filter((s) => s.item === 0)
    expect(first.map((s) => [s.lang ?? 'en', s.volume ?? 1])).toEqual([
      ['en', 1],
      ['en', 0],
      ['en', 1],
      ['en', 0],
      ['it-IT', 1],
      ['en', 0],
    ])
    // La pausa dura un po' più della frase (velocità ridotta).
    expect(first[1]?.rate).toBeLessThan(1)
    // Senza traduzione disponibile non si legge niente in italiano.
    expect(seg.filter((s) => s.item === 1 && s.lang === 'it-IT')).toHaveLength(0)
  })

  it('opzioni: una sola ripetizione, niente traduzione', () => {
    const seg = buildAutoSegments(items, { repetitions: 1, pause: 1, translation: false })
    expect(seg.filter((s) => (s.volume ?? 1) > 0)).toHaveLength(2)
  })
})
