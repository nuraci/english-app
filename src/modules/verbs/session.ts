import { State } from 'ts-fsrs'
import type { ItemRecord } from '../../core/db/db'
import { pick, shuffle, type Rng } from '../../core/random'
import type { Exercise } from '../../core/session'
import { verbItemId, type Verb, type VerbGroup } from './data'
import {
  buildExercise,
  flashcardExercise,
  formExercise,
  sentenceExercise,
  type VerbExerciseKind,
} from './exercises'
import { computeProgress } from './progress'

/** Circa 20 esercizi da ~30 secondi: una sessione da 10 minuti. */
export const SESSION_LENGTH = 20
export const MAX_NEW_VERBS = 5
/** Con molti ripassi arretrati si introducono meno verbi nuovi, per non sovraccaricare. */
const BUSY_THRESHOLD = 10
const MAX_NEW_WHEN_BUSY = 2

export type VerbSessionPlan = {
  exercises: Exercise[]
  newVerbs: Verb[]
  reviewVerbs: Verb[]
  group?: VerbGroup
}

/** Modalità per un ripasso: chi sta ancora imparando fa esercizi più guidati. */
function reviewKind(item: ItemRecord, rng: Rng): VerbExerciseKind {
  const learning = item.card.state === State.Learning || item.card.state === State.Relearning
  return learning
    ? pick(['flashcard', 'past', 'participle'] as const, rng)
    : pick(['past', 'participle', 'sentence', 'listen', 'flashcard'] as const, rng)
}

/**
 * Compone una sessione: ripassi SRS scaduti mescolati con i verbi nuovi del gruppo corrente.
 * Ogni verbo nuovo compare due volte: una flashcard per conoscerlo e, più avanti,
 * un esercizio scritto per fissarlo. Se avanza spazio si ripassano in anticipo i verbi più fragili.
 */
export function buildVerbSession(options: {
  verbs: readonly Verb[]
  groups: readonly VerbGroup[]
  items: readonly ItemRecord[]
  now: Date
  rng: Rng
}): VerbSessionPlan {
  const { verbs, groups, items, now, rng } = options
  const verbById = new Map(verbs.map((v) => [verbItemId(v), v]))
  const progress = computeProgress(verbs, groups, items)

  const dueItems = items
    .filter((i) => i.due <= now.getTime() && verbById.has(i.id))
    .sort((a, b) => a.due - b.due)
  const maxNew = dueItems.length >= BUSY_THRESHOLD ? MAX_NEW_WHEN_BUSY : MAX_NEW_VERBS
  const newVerbs = progress.nextNewVerbs.slice(0, maxNew)
  const reviewSlots = Math.max(0, SESSION_LENGTH - newVerbs.length * 2)
  const reviews = shuffle(dueItems.slice(0, reviewSlots), rng)

  const toExercise = (item: ItemRecord) =>
    buildExercise(verbById.get(item.id) as Verb, reviewKind(item, rng), verbs, rng)

  // Prima parte: un verbo nuovo, un ripasso, un verbo nuovo, un ripasso...
  const exercises: Exercise[] = []
  const reviewQueue = [...reviews]
  for (const verb of newVerbs) {
    exercises.push(flashcardExercise(verb, true))
    const review = reviewQueue.shift()
    if (review) exercises.push(toExercise(review))
  }
  exercises.push(...reviewQueue.map(toExercise))
  // Poi si fissano i verbi nuovi, in ordine diverso.
  exercises.push(
    ...shuffle(newVerbs, rng).map((v) =>
      rng() < 0.5 ? sentenceExercise(v) : formExercise(v, rng() < 0.5 ? 'past' : 'participle'),
    ),
  )

  // Spazio libero: ripasso anticipato dei verbi già visti con stabilità più bassa.
  const used = new Set([...newVerbs.map(verbItemId), ...reviews.map((r) => r.id)])
  const extra = items
    .filter((i) => !used.has(i.id) && verbById.has(i.id))
    .sort((a, b) => a.card.stability - b.card.stability)
    .slice(0, Math.max(0, SESSION_LENGTH - exercises.length))
  exercises.push(...extra.map(toExercise))

  return {
    exercises,
    newVerbs,
    reviewVerbs: reviews.map((r) => verbById.get(r.id) as Verb),
    group: progress.currentGroup,
  }
}
