import type { Evaluation } from './evaluate'
import type { Exercise } from './types'

export type SessionState = {
  exercises: Exercise[]
  index: number
  /** Valutazione della risposta all'esercizio corrente, finché non si passa al successivo. */
  current?: Evaluation
  results: { exerciseId: string; evaluation: Evaluation }[]
  startedAt: number
}

export type SessionAction =
  { type: 'answer'; evaluation: Evaluation } | { type: 'next' } | { type: 'restart'; now: number }

export function createSession(exercises: Exercise[], now = Date.now()): SessionState {
  return { exercises, index: 0, results: [], startedAt: now }
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'answer': {
      const exercise = state.exercises[state.index]
      if (!exercise || state.current) return state
      return {
        ...state,
        current: action.evaluation,
        results: [...state.results, { exerciseId: exercise.id, evaluation: action.evaluation }],
      }
    }
    case 'next':
      if (!state.current) return state
      return { ...state, index: state.index + 1, current: undefined }
    case 'restart':
      return createSession(state.exercises, action.now)
  }
}

export function currentExercise(state: SessionState): Exercise | undefined {
  return state.exercises[state.index]
}

export function isFinished(state: SessionState): boolean {
  return state.index >= state.exercises.length
}

export function sessionScore(state: SessionState) {
  return {
    total: state.results.length,
    correct: state.results.filter((r) => r.evaluation.correct).length,
  }
}
