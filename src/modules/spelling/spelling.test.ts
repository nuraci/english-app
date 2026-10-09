import { describe, expect, it } from 'vitest'
import { createEmptyCard } from 'ts-fsrs'
import {
  generateEmail,
  generateSerial,
  natoSpelling,
  spellOut,
  spellReadable,
  spellingCodes,
} from '../../content/generators/spelling'
import type { ItemRecord } from '../../core/db/db'
import { spokenToChars } from '../../core/normalize'
import { createRng } from '../../core/random'
import { buildFeedback, evaluate, itemIdOf } from '../../core/session'
import { letterGroups, letterItemId, letters, TRAP_LETTERS } from './data'
import { dictationExercise, letterListenExercise, personalExercise } from './exercises'
import {
  buildAlphabetSession,
  buildAloudSession,
  buildDictationSession,
  buildPersonalSession,
  DICTATION_LENGTH,
} from './session'

const now = new Date('2026-10-09T09:00:00Z')
const options = { accent: 'en-GB' as const, nato: false }
const sameO = (s: string) => s.toUpperCase().replace(/\s/g, '').replace(/O/g, '0')

describe('contenuti', () => {
  it('26 lettere con pronuncia e NATO; i gruppi usano lettere esistenti', () => {
    expect(letters).toHaveLength(26)
    const all = new Set(letters.map((l) => l.letter))
    for (const g of letterGroups)
      for (const l of g.letters) expect(all.has(l), `${g.id}:${l}`).toBe(true)
    expect(TRAP_LETTERS).toEqual(
      expect.arrayContaining(['A', 'E', 'I', 'G', 'J', 'K', 'Q', 'R', 'W', 'Y', 'H', 'Z']),
    )
  })

  it('almeno 100 codici reali tra part number, sigle e nomi', () => {
    expect(spellingCodes.length).toBeGreaterThanOrEqual(100)
    expect(spellingCodes.map((c) => c.text)).toEqual(
      expect.arrayContaining(['STM32H743', 'LPC55S69', 'ESP32-S3', 'I2C', 'CAN FD', 'JTAG']),
    )
  })
})

describe('spellOut ↔ spokenToChars: quello che dice la voce si riconverte nel codice', () => {
  const rng = createRng(4)
  const samples = [
    ...spellingCodes.map((c) => c.text),
    ...Array.from({ length: 100 }, () => generateEmail(rng)),
    ...Array.from({ length: 100 }, () => generateSerial(rng)),
  ]
  for (const accent of ['en-US', 'en-GB'] as const) {
    it(accent, () => {
      for (const text of samples) {
        expect(
          sameO(spokenToChars(spellOut(text, accent))),
          `${text} → ${spellOut(text, accent)}`,
        ).toBe(sameO(text))
      }
    })
  }

  it('esempi', () => {
    expect(spellOut('I2C', 'en-GB')).toBe('eye, two, see')
    expect(spellOut('RSS')).toBe('ar, double ess')
    expect(spellOut('Z', 'en-US')).toBe('zee')
    expect(spellOut('Z', 'en-GB')).toBe('zed')
    expect(spellOut('a.b@c-d')).toBe('ay, dot, bee, at, see, dash, dee')
    expect(spellReadable('CAN FD')).toBe('C · A · N · F · D')
    expect(natoSpelling('SPI')).toBe('Sierra Papa India')
  })
})

describe('dettato (accettazione: 10 codici, correzione lettera per lettera)', () => {
  it('10 codici di tipi diversi, ognuno detto dalla voce', () => {
    const ex = buildDictationSession({ items: [], now, rng: createRng(1), options })
    expect(ex).toHaveLength(DICTATION_LENGTH)
    expect(new Set(ex.map((e) => e.id)).size).toBe(DICTATION_LENGTH)
    expect(
      ex.every((e) => e.prompt.autoplay && e.prompt.speak && e.answer.match === 'spelling'),
    ).toBe(true)
    const kinds = ex.map((e) => e.prompt.text)
    expect(kinds.filter((k) => k?.includes('Part number'))).toHaveLength(4)
    expect(kinds.filter((k) => k?.includes('email'))).toHaveLength(1)
  })

  it('evidenzia le lettere sbagliate e riconosce la trappola', () => {
    const ex = dictationExercise({ text: 'LPC55S69', category: 'part' }, options, 0)
    const e = evaluate(ex, { kind: 'text', value: 'LPC55S96' })
    expect(e.correct).toBe(false)
    expect(e.charOps?.filter((o) => o.op !== 'ok')).toHaveLength(2)
    expect(buildFeedback(e).detail).toBe('2 lettere da sistemare: guarda quelle evidenziate.')

    const i2c = dictationExercise({ text: 'I2C', category: 'acronym' }, options, 0)
    const trap = evaluate(i2c, { kind: 'text', value: 'E2C' })
    expect(trap).toMatchObject({ kind: 'close', errorTag: 'aei' })
    expect(buildFeedback(trap)).toMatchObject({
      title: 'Quasi!',
      detail: 'Hai scritto «E», era «I».',
    })
    expect(i2c.tips?.aei).toContain('«ai»')

    expect(
      evaluate(dictationExercise({ text: 'ESP32-S3', category: 'part' }, options, 0), {
        kind: 'text',
        value: 'esp32s3',
      }).correct,
    ).toBe(true)
  })

  it('i codici scaduti nell’SRS tornano per primi', () => {
    const item: ItemRecord = {
      id: 'spelling:code:TMS320F28379D',
      module: 'spelling',
      card: createEmptyCard(now),
      due: now.getTime() - 1,
      createdAt: 0,
    }
    for (let seed = 0; seed < 10; seed++) {
      const ex = buildDictationSession({ items: [item], now, rng: createRng(seed), options })
      expect(ex.map(itemIdOf)).toContain(item.id)
    }
  })
})

describe('alfabeto', () => {
  it('chi inizia vede prima le lettere trappola', () => {
    const ex = buildAlphabetSession({ items: [], now, rng: createRng(2), options })
    expect(ex).toHaveLength(12)
    const ids = ex.map(itemIdOf)
    expect(ids.every((id) => TRAP_LETTERS.some((l) => letterItemId(l) === id))).toBe(true)
  })

  it('scelta tra lettere che si confondono, con suggerimento mirato', () => {
    const ex = letterListenExercise('G', 'en-GB', createRng(3))
    expect(ex.answer.choices).toContain('G')
    expect(ex.answer.choices?.length).toBeGreaterThanOrEqual(2)
    const wrong = evaluate(ex, { kind: 'text', value: 'J' })
    expect(wrong.errorTag).toBe('gj')
  })
})

describe('spelling a voce e dati personali', () => {
  it('lo spelling dettato viene capito, anche con l’alfabeto NATO', () => {
    const [first] = buildAloudSession({ items: [], now, rng: createRng(5), options })
    expect(first?.answer.mode).toBe('speak')
    const ex = personalExercise(
      { kind: 'surname', label: 'Cognome', question: 'And how do you spell your surname?' },
      'Ricci',
      options,
    )
    expect(ex.prompt).toMatchObject({ speak: 'And how do you spell your surname?', autoplay: true })
    expect(evaluate(ex, { kind: 'speech', transcripts: ['R I double C I'] }).correct).toBe(true)
    expect(
      evaluate(ex, { kind: 'speech', transcripts: ['Romeo India Charlie Charlie India'] }).correct,
    ).toBe(true)
    const miss = evaluate(ex, { kind: 'speech', transcripts: ['are e see see eye'] })
    expect(miss).toMatchObject({ correct: false, errorTag: 'aei' })
    expect(buildFeedback(miss).detail).toBe('Ho sentito «E», era «I».')
  })

  it('usa solo i dati compilati', () => {
    expect(
      buildPersonalSession({ name: 'Mario', surname: ' ', email: 'm.r@x.it' }, options).map(
        itemIdOf,
      ),
    ).toEqual(['spelling:personal:name', 'spelling:personal:email'])
  })
})

describe('statistiche e dati personali', () => {
  it('raggruppa le confusioni ricorrenti', async () => {
    const { computeTrapStats } = await import('./stats')
    const r = (tag: string | undefined, correct: boolean, t: number) => ({
      itemId: 'spelling:code:I2C',
      module: 'spelling',
      rating: 1 as const,
      correct,
      errorTag: tag,
      expected: 'I2C',
      answer: 'E2C',
      reviewedAt: t,
    })
    const stats = computeTrapStats([
      r('aei', false, 1),
      r('aei', false, 2),
      r('gj', false, 3),
      r('aei', true, 4),
      r(undefined, false, 5),
    ])
    expect(stats).toEqual([
      {
        tag: 'aei',
        count: 2,
        examples: [
          { expected: 'I2C', answer: 'E2C' },
          { expected: 'I2C', answer: 'E2C' },
        ],
      },
    ])
  })

  it('salva e rilegge i dati personali in locale', async () => {
    const { getPersonalData, savePersonalData } = await import('./personalData')
    await savePersonalData('surname', 'Bianchi')
    await savePersonalData('surname', 'Rossi')
    await savePersonalData('email', 'm.rossi@example.com')
    expect(await getPersonalData()).toEqual({ surname: 'Rossi', email: 'm.rossi@example.com' })
  })
})
