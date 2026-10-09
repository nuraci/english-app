import { shuffle, type Rng } from '../../core/random'
import {
  LAST_QUESTION_ID,
  questions,
  TELL_ME_ID,
  type Question,
  type QuestionCategory,
} from './data'

export const INTERVIEW_LENGTH = 10

/** Le domande in mezzo: un colloquio tecnico vero ha più domande tecniche. */
const MIX: [QuestionCategory, number][] = [
  ['technical', 4],
  ['behavioral', 2],
  ['hr', 2],
]

/**
 * Le 10 domande di una prova: si parte sempre da "Tell me about yourself" e si chiude con
 * "Do you have any questions for us?". In mezzo, le domande provate meno volte.
 */
export function buildInterviewPlan(
  practiceCounts: ReadonlyMap<string, number>,
  rng: Rng,
): Question[] {
  const first = questions.find((q) => q.id === TELL_ME_ID)
  const last = questions.find((q) => q.id === LAST_QUESTION_ID)
  const middle: Question[] = []
  for (const [category, count] of MIX) {
    const pool = questions.filter((q) => q.category === category && q !== first && q !== last)
    const ordered = shuffle(pool, rng).sort(
      (a, b) => (practiceCounts.get(a.id) ?? 0) - (practiceCounts.get(b.id) ?? 0),
    )
    middle.push(...ordered.slice(0, count))
  }
  return [first, ...shuffle(middle, rng), last].filter((q): q is Question => q !== undefined)
}
