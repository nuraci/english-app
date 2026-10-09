import { useEffect, useReducer, useRef, type ReactNode } from 'react'
import {
  buildFeedback,
  createSession,
  currentExercise,
  isFinished,
  saveAnswer,
  saveSession,
  sessionReducer,
  sessionScore,
  type Evaluation,
  type Exercise,
  type SessionState,
} from '../../core/session'
import { Button } from '../Button'
import { ExerciseCard } from '../exercise/ExerciseCard'
import { Feedback } from '../Feedback'
import { Card } from '../Screen'

type Props = {
  module: string
  exercises: Exercise[]
  onDone: () => void
  /** Contenuto extra nel riepilogo finale. */
  summary?: ReactNode
  /** Chiamata una volta, a sessione finita, con tutti i risultati. */
  onFinish?: (results: SessionState['results']) => void
}

function closingMessage(correct: number, total: number): string {
  const ratio = total ? correct / total : 0
  if (ratio >= 0.8) return 'Ottimo lavoro! 🎉'
  if (ratio >= 0.5) return 'Bene, stai migliorando! 💪'
  return 'Ogni sessione conta: la prossima andrà meglio! 🌱'
}

/**
 * Esegue una sessione di esercizi: risposta → feedback → avanti.
 * Ogni risposta aggiorna subito l'SRS; gli errori tornano una volta in fondo alla sessione.
 */
export function SessionRunner({ module, exercises, onDone, summary, onFinish }: Props) {
  const [state, dispatch] = useReducer(sessionReducer, exercises, (ex) => createSession(ex))
  const saved = useRef(false)
  const exercise = currentExercise(state)
  const finished = isFinished(state)

  useEffect(() => {
    if (!finished || saved.current || state.results.length === 0) return
    saved.current = true
    void saveSession({ module, startedAt: state.startedAt, ...sessionScore(state) })
    onFinish?.(state.results)
  }, [finished, module, state, onFinish])

  const answer = (evaluation: Evaluation) => {
    if (!exercise) return
    dispatch({ type: 'answer', evaluation })
    void saveAnswer(exercise, evaluation)
  }

  if (finished || !exercise) {
    const { correct, total } = sessionScore(state)
    return (
      <Card>
        <p className="text-2xl font-bold">{closingMessage(correct, total)}</p>
        <p className="mt-2 text-lg">
          {correct} su {total} al primo colpo.
        </p>
        {correct < total && (
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Gli errori li rivedrai presto: è proprio così che si impara.
          </p>
        )}
        {summary}
        <Button className="mt-5 w-full" onClick={onDone}>
          Fine
        </Button>
      </Card>
    )
  }

  const progress = Math.round((state.index / state.exercises.length) * 100)

  return (
    <div className="space-y-4">
      <div
        role="progressbar"
        aria-label="Avanzamento della sessione"
        aria-valuenow={state.index}
        aria-valuemin={0}
        aria-valuemax={state.exercises.length}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ExerciseCard
        key={exercise.id}
        exercise={exercise}
        answered={!!state.current}
        onAnswer={answer}
      />
      {state.current && (
        <Feedback
          message={buildFeedback(state.current, state.index)}
          explanation={
            (state.current.errorTag && exercise.tips?.[state.current.errorTag]) ||
            exercise.explanation
          }
          speak={exercise.say}
          charOps={state.current.charOps}
          onContinue={() => dispatch({ type: 'next', retry: !state.current?.correct })}
        />
      )}
    </div>
  )
}
