import { State } from 'ts-fsrs'
import type { ItemRecord } from '../../core/db/db'
import { pick, shuffle, type Rng } from '../../core/random'
import type { Exercise } from '../../core/session'
import { termItemId, trapItemId, trapList, type Deck } from './data'
import { buildVocabExercise, repeatExercise, trapExercise, type VocabKind } from './exercises'

export const VOCAB_SESSION_LENGTH = 15
export const MAX_NEW_TERMS = 5
export const TRAP_SESSION_LENGTH = 12

export type DeckStatus = { seen: number; learned: number; total: number }

export function deckStatus(deck: Deck, items: readonly ItemRecord[]): DeckStatus {
  const byId = new Map(items.map((i) => [i.id, i]))
  let seen = 0
  let learned = 0
  for (const t of deck.terms) {
    const item = byId.get(termItemId(deck, t))
    if (!item) continue
    seen++
    if (item.card.state === State.Review) learned++
  }
  return { seen, learned, total: deck.terms.length }
}

/**
 * Sessione su un mazzo: ripassi scaduti, poi termini nuovi nell'ordine del mazzo.
 * Ogni termine nuovo si incontra prima ascoltandolo e ripetendolo, poi in un esercizio di significato.
 */
export function buildVocabSession(options: {
  deck: Deck
  items: readonly ItemRecord[]
  now: Date
  rng: Rng
}): Exercise[] {
  const { deck, items, now, rng } = options
  const byId = new Map(items.map((i) => [i.id, i]))
  const terms = deck.terms.map((t) => ({ term: t, item: byId.get(termItemId(deck, t)) }))
  const due = shuffle(
    terms.filter((x) => x.item && x.item.due <= now.getTime()),
    rng,
  )
  const fresh = terms.filter((x) => !x.item).slice(0, MAX_NEW_TERMS)
  const reviewSlots = Math.max(0, VOCAB_SESSION_LENGTH - fresh.length * 2)

  const reviewKind = (item: ItemRecord): VocabKind =>
    item.card.state === State.Review
      ? pick(['translate', 'meaning', 'definition', 'explain', 'repeat'] as const, rng)
      : pick(['repeat', 'meaning', 'translate'] as const, rng)

  const exercises: Exercise[] = []
  const reviews = due.slice(0, reviewSlots)
  const queue = [...reviews]
  for (const { term } of fresh) {
    exercises.push(repeatExercise(deck, term))
    const r = queue.shift()
    if (r?.item) exercises.push(buildVocabExercise(deck, r.term, reviewKind(r.item), rng))
  }
  for (const r of queue)
    if (r.item) exercises.push(buildVocabExercise(deck, r.term, reviewKind(r.item), rng))
  for (const { term } of shuffle(fresh, rng)) {
    exercises.push(
      buildVocabExercise(
        deck,
        term,
        pick(['meaning', 'translate', 'definition'] as const, rng),
        rng,
      ),
    )
  }

  // Spazio libero: ripasso anticipato dei termini più fragili.
  const used = new Set([...fresh, ...reviews].map((x) => x.term.id))
  const extra = terms
    .filter((x) => x.item && !used.has(x.term.id))
    .sort((a, b) => (a.item?.card.stability ?? 0) - (b.item?.card.stability ?? 0))
    .slice(0, Math.max(0, VOCAB_SESSION_LENGTH - exercises.length))
  for (const x of extra)
    if (x.item) exercises.push(buildVocabExercise(deck, x.term, reviewKind(x.item), rng))
  return exercises
}

/** Trappole di pronuncia: scadute, poi mai viste, poi le altre. */
export function buildTrapSession(options: {
  items: readonly ItemRecord[]
  now: Date
  rng: Rng
}): Exercise[] {
  const { items, now, rng } = options
  const byId = new Map(items.map((i) => [i.id, i]))
  const words = trapList.words.map((w) => ({ w, item: byId.get(trapItemId(w)) }))
  const ordered = [
    ...shuffle(
      words.filter((x) => x.item && x.item.due <= now.getTime()),
      rng,
    ),
    ...words.filter((x) => !x.item),
    ...shuffle(
      words.filter((x) => x.item && x.item.due > now.getTime()),
      rng,
    ),
  ]
  return ordered.slice(0, TRAP_SESSION_LENGTH).map((x) => trapExercise(x.w))
}
