import firmware from '../../content/vocab/firmware.json'
import instruments from '../../content/vocab/instruments.json'
import measurements from '../../content/vocab/measurements.json'
import softskills from '../../content/vocab/softskills.json'
import traps from '../../content/vocab/traps.json'
import validation from '../../content/vocab/validation.json'

export const MODULE = 'vocab'

export type Term = {
  id: string
  en: string
  it: string
  definition: string
  example: string
  /** Nota di pronuncia, in italiano. */
  note?: string
  /** Pronuncia per la sintesi vocale, se diversa dalla grafia (sigle: "S M U"). */
  say?: string
  /** Parola che gli italiani pronunciano spesso male. */
  trap?: boolean
}

export type Deck = { id: string; name: string; description: string; order: number; terms: Term[] }
export type TrapWord = { id: string; en: string; it: string; note: string; example: string }

export const decks: Deck[] = [instruments, measurements, firmware, validation, softskills].sort(
  (a, b) => a.order - b.order,
)
export const trapList: { name: string; description: string; words: TrapWord[] } = traps

export const termItemId = (deck: Pick<Deck, 'id'>, term: Pick<Term, 'id'>) =>
  `${MODULE}:${deck.id}:${term.id}`
export const trapItemId = (word: Pick<TrapWord, 'id'>) => `${MODULE}:trap:${word.id}`

export function speechOf(term: Pick<Term, 'en' | 'say'>): string {
  return term.say ?? term.en
}
