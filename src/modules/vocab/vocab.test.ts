import { describe, expect, it } from 'vitest'
import { createEmptyCard, Rating } from 'ts-fsrs'
import type { ItemRecord } from '../../core/db/db'
import { normalize } from '../../core/normalize'
import { createRng } from '../../core/random'
import { evaluate, itemIdOf } from '../../core/session'
import { scheduleReview } from '../../core/srs'
import { decks, speechOf, termItemId, trapList, type Deck } from './data'
import {
  canTranslate,
  definitionExercise,
  meaningExercise,
  repeatExercise,
  translateExercise,
} from './exercises'
import { buildTrapSession, buildVocabSession, deckStatus, VOCAB_SESSION_LENGTH } from './session'

const now = new Date('2026-10-09T09:00:00Z')
const deck = (id: string) => decks.find((d) => d.id === id) as Deck
const term = (d: Deck, en: string) => d.terms.find((t) => t.en === en) as Deck['terms'][number]

describe('contenuti (accettazione: almeno 150 termini in 5 mazzi)', () => {
  it('5 mazzi, almeno 150 termini completi', () => {
    expect(decks.map((d) => d.id)).toEqual([
      'instruments',
      'measurements',
      'firmware',
      'validation',
      'softskills',
    ])
    const all = decks.flatMap((d) => d.terms)
    expect(all.length).toBeGreaterThanOrEqual(150)
    for (const t of all) {
      expect(t.en && t.it && t.definition && t.example, t.en).toBeTruthy()
      expect(speechOf(t).trim(), t.en).toBeTruthy()
    }
  })

  it('nessun doppione dentro un mazzo (le scelte multiple restano chiare)', () => {
    for (const d of decks) {
      expect(new Set(d.terms.map((t) => normalize(t.en))).size, d.id).toBe(d.terms.length)
      expect(new Set(d.terms.map((t) => normalize(t.it))).size, d.id).toBe(d.terms.length)
    }
  })

  it('le trappole di pronuncia del piano ci sono tutte', () => {
    const words = trapList.words.map((w) => w.en)
    expect(words).toEqual(
      expect.arrayContaining([
        'cache',
        'data',
        'silicon',
        'oscilloscope',
        'width',
        'debug',
        'via',
        'voltage',
      ]),
    )
    for (const w of trapList.words) expect(w.note, w.en).toMatch(/«/)
  })
})

describe('esercizi', () => {
  const rng = createRng(1)

  it('ascolta e ripeti: accetta anche le sigle dette lettera per lettera', () => {
    const smu = repeatExercise(deck('instruments'), term(deck('instruments'), 'SMU'))
    expect(smu.prompt).toMatchObject({ speak: 'S M U', autoplay: true })
    for (const t of ['SMU', 's m u', 'S.M.U.']) {
      expect(evaluate(smu, { kind: 'speech', transcripts: [t] }).correct, t).toBe(true)
    }
    const osc = repeatExercise(deck('instruments'), term(deck('instruments'), 'oscilloscope'))
    expect(evaluate(osc, { kind: 'speech', transcripts: ['oscilloscope'] }).correct).toBe(true)
    expect(osc.prompt.hint).toContain('o-SIL-o-scope')
  })

  it('traduzione solo se la parola italiana non contiene già la risposta', () => {
    expect(canTranslate(term(deck('instruments'), 'probe'))).toBe(true)
    expect(canTranslate(term(deck('measurements'), 'jitter'))).toBe(false)
    expect(canTranslate(term(deck('instruments'), 'SMU'))).toBe(false)
    const ex = translateExercise(deck('instruments'), term(deck('instruments'), 'probe'))
    expect(evaluate(ex, { kind: 'text', value: 'Probe' }).correct).toBe(true)
    expect(
      evaluate(
        translateExercise(deck('measurements'), term(deck('measurements'), 'peak-to-peak')),
        { kind: 'text', value: 'peak to peak' },
      ).correct,
    ).toBe(true)
  })

  it('scelte multiple: 4 opzioni diverse, una giusta', () => {
    for (const d of decks) {
      for (const t of d.terms) {
        for (const ex of [meaningExercise(d, t, rng), definitionExercise(d, t, rng)]) {
          const choices = ex.answer.choices ?? []
          expect(new Set(choices).size, t.en).toBe(4)
          expect(choices).toContain(ex.answer.accepted[0])
        }
      }
    }
  })
})

describe('sessione', () => {
  const d = deck('firmware')
  const item = (t: Deck['terms'][number], due: number): ItemRecord => ({
    id: termItemId(d, t),
    module: 'vocab',
    card: scheduleReview(createEmptyCard(now), Rating.Good, now),
    due,
    createdAt: 0,
  })

  it('prima sessione: 5 termini nuovi, prima ascolta e ripeti', () => {
    const ex = buildVocabSession({ deck: d, items: [], now, rng: createRng(2) })
    expect(ex).toHaveLength(10)
    expect(ex[0]?.answer.mode).toBe('speak')
    expect(itemIdOf(ex[0] as (typeof ex)[number])).toBe(
      termItemId(d, d.terms[0] as Deck['terms'][number]),
    )
  })

  it('mescola ripassi scaduti e termini nuovi, senza superare 15 esercizi', () => {
    const items = d.terms.slice(0, 12).map((t, i) => item(t, now.getTime() - (i + 1) * 1000))
    const ex = buildVocabSession({ deck: d, items, now, rng: createRng(3) })
    expect(ex.length).toBeLessThanOrEqual(VOCAB_SESSION_LENGTH)
    const ids = ex.map(itemIdOf)
    expect(ids.filter((id) => items.some((i) => i.id === id)).length).toBeGreaterThan(0)
    expect(ids).toContain(termItemId(d, d.terms[12] as Deck['terms'][number]))
  })

  it('avanzamento del mazzo', () => {
    const items = d.terms.slice(0, 3).map((t) => item(t, now.getTime()))
    expect(deckStatus(d, items)).toEqual({ seen: 3, learned: 0, total: d.terms.length })
  })

  it('trappole: 12 parole, tutte da ripetere', () => {
    const ex = buildTrapSession({ items: [], now, rng: createRng(4) })
    expect(ex).toHaveLength(12)
    expect(ex.every((e) => e.answer.mode === 'speak' && e.prompt.autoplay)).toBe(true)
  })
})
