import {
  generateEmail,
  generateSerial,
  spellingCodes,
  type SpellingCategory,
  type SpellingItem,
} from '../../content/generators/spelling'
import type { ItemRecord } from '../../core/db/db'
import { shuffle, type Rng } from '../../core/random'
import type { Exercise } from '../../core/session'
import { codeItemId, letterItemId, letters, personalFields, TRAP_LETTERS } from './data'
import {
  aloudExercise,
  dictationExercise,
  letterListenExercise,
  letterNameExercise,
  letterTypeExercise,
  personalExercise,
  type SpellingOptions,
} from './exercises'

export const ALPHABET_LENGTH = 12
export const DICTATION_LENGTH = 10
export const ALOUD_LENGTH = 8

type Context = { items: readonly ItemRecord[]; now: Date; rng: Rng; options: SpellingOptions }

const isDue = (items: readonly ItemRecord[], now: Date) => {
  const due = new Set(items.filter((i) => i.due <= now.getTime()).map((i) => i.id))
  const seen = new Set(items.map((i) => i.id))
  return { due, seen }
}

/** Lettere: prima i ripassi scaduti, poi le trappole mai viste, poi il resto dell'alfabeto. */
export function buildAlphabetSession({ items, now, rng, options }: Context): Exercise[] {
  const { due, seen } = isDue(items, now)
  const all = letters.map((l) => l.letter)
  const dueLetters = shuffle(
    all.filter((l) => due.has(letterItemId(l))),
    rng,
  )
  const newTraps = TRAP_LETTERS.filter((l) => !seen.has(letterItemId(l)))
  const rest = shuffle(
    all.filter((l) => !dueLetters.includes(l) && !newTraps.includes(l)),
    rng,
  )
  const chosen = [...new Set([...dueLetters, ...newTraps, ...rest])].slice(0, ALPHABET_LENGTH)
  return shuffle(chosen, rng).map((letter, i) =>
    i % 4 === 3
      ? letterNameExercise(letter, options.accent, options.nato)
      : i % 4 === 2
        ? letterTypeExercise(letter, options.accent)
        : letterListenExercise(letter, options.accent, rng),
  )
}

/** Quanti codici di ogni tipo in un dettato da 10. */
const DICTATION_MIX: [SpellingCategory, number][] = [
  ['part', 4],
  ['acronym', 2],
  ['name', 2],
  ['email', 1],
  ['serial', 1],
]

function pickCodes(ctx: Context, mix: [SpellingCategory, number][]): SpellingItem[] {
  const { due, seen } = isDue(ctx.items, ctx.now)
  const out: SpellingItem[] = []
  for (const [category, count] of mix) {
    if (category === 'email' || category === 'serial') {
      for (let i = 0; i < count; i++) {
        out.push({
          category,
          text: category === 'email' ? generateEmail(ctx.rng) : generateSerial(ctx.rng),
        })
      }
      continue
    }
    const pool = spellingCodes.filter((c) => c.category === category)
    // Ripassi scaduti, poi codici nuovi, poi quelli già visti: sempre qualcosa di utile.
    const ordered = [
      ...shuffle(
        pool.filter((c) => due.has(codeItemId(c.text))),
        ctx.rng,
      ),
      ...shuffle(
        pool.filter((c) => !seen.has(codeItemId(c.text))),
        ctx.rng,
      ),
      ...shuffle(
        pool.filter((c) => seen.has(codeItemId(c.text)) && !due.has(codeItemId(c.text))),
        ctx.rng,
      ),
    ]
    out.push(...ordered.slice(0, count))
  }
  return shuffle(out, ctx.rng)
}

/** Dettato di 10 codici: part number, sigle, cognomi, un'email e un numero di serie. */
export function buildDictationSession(ctx: Context): Exercise[] {
  return pickCodes(ctx, DICTATION_MIX).map((item, i) => dictationExercise(item, ctx.options, i))
}

/** Spelling a voce: l'app mostra il codice, l'utente lo detta. */
export function buildAloudSession(ctx: Context): Exercise[] {
  const mix: [SpellingCategory, number][] = [
    ['part', 3],
    ['acronym', 2],
    ['name', 2],
    ['email', 1],
  ]
  return pickCodes(ctx, mix).map((item, i) => aloudExercise(item, ctx.options, i))
}

/** "Spell your name / surname / email" con i dati inseriti dall'utente. */
export function buildPersonalSession(
  values: Record<string, string>,
  options: SpellingOptions,
): Exercise[] {
  return personalFields
    .filter((f) => values[f.kind]?.trim())
    .map((f) => personalExercise(f, (values[f.kind] as string).trim(), options))
}
