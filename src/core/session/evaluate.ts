import {
  compareAnswer,
  compareNumeric,
  compareSpelling,
  type CharOp,
  type CompareResult,
  type MatchKind,
  type WordDiff,
} from '../normalize'
import { Rating, type Grade } from '../srs'
import type { Exercise, Response, SelfGrade } from './types'

export type Evaluation = {
  correct: boolean
  kind: MatchKind | 'self'
  /** Da dove viene la risposta: cambia il modo di descrivere l'errore. */
  source: Response['kind']
  /** Cosa ha risposto l'utente (per le trascrizioni: quella più vicina alla risposta giusta). */
  given: string
  expected: string
  diffs: WordDiff[]
  grade: Grade
  /** Tipo di errore riconosciuto (es. "teen-ty"), per feedback mirato e statistiche. */
  errorTag?: string
  /** Spelling: allineamento lettera per lettera, per evidenziare gli errori. */
  charOps?: CharOp[]
}

type AnyCompareResult = CompareResult & { errorTag?: string; charOps?: CharOp[] }

const SELF_GRADES: Record<SelfGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

const KIND_GRADES: Record<MatchKind, Grade> = {
  exact: Rating.Good,
  typo: Rating.Hard,
  close: Rating.Again,
  wrong: Rating.Again,
}

const RANK: Record<MatchKind, number> = { exact: 0, typo: 1, close: 2, wrong: 3 }

export function evaluate(exercise: Exercise, response: Response): Evaluation {
  const expectedDefault = exercise.answer.accepted[0] ?? ''

  if (response.kind === 'self') {
    return {
      correct: response.grade !== 'again',
      kind: 'self',
      source: 'self',
      given: '',
      expected: expectedDefault,
      diffs: [],
      grade: SELF_GRADES[response.grade],
    }
  }

  const candidates = response.kind === 'text' ? [response.value] : response.transcripts
  if (candidates.length === 0) candidates.push('')

  // Con la voce basta che una delle trascrizioni alternative sia giusta.
  const { match, ignoreDash, letterGroups } = exercise.answer
  const spoken = response.kind === 'speech'
  const compare = (given: string, accepted: string[]): AnyCompareResult =>
    match === 'number'
      ? compareNumeric(given, accepted)
      : match === 'spelling'
        ? compareSpelling(given, accepted, { spoken, ignoreDash, letterGroups })
        : compareAnswer(given, accepted)
  let best: { given: string; result: AnyCompareResult } | undefined
  for (const given of candidates) {
    const result = compare(given, exercise.answer.accepted)
    if (!best || RANK[result.kind] < RANK[best.result.kind]) best = { given, result }
  }
  const { given, result } = best as NonNullable<typeof best>

  return {
    correct: result.correct,
    kind: result.kind,
    source: response.kind,
    given,
    expected: result.expected,
    diffs: result.diffs,
    grade: KIND_GRADES[result.kind],
    ...(result.errorTag ? { errorTag: result.errorTag } : {}),
    ...(result.charOps ? { charOps: result.charOps } : {}),
  }
}
