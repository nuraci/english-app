import { useState, type FormEvent } from 'react'
import { useSettings } from '../../core/db/settings'
import { evaluate, type Evaluation, type Exercise, type SelfGrade } from '../../core/session'
import { isSttSupported, sttErrorMessage, useListener } from '../../core/speech'
import { Button } from '../Button'
import { Icon } from '../Icon'
import { Card } from '../Screen'
import { SpeakButton } from './SpeakButton'

type Props = {
  exercise: Exercise
  /** Dopo la risposta i comandi si bloccano: il feedback lo mostra il genitore. */
  answered: boolean
  onAnswer: (evaluation: Evaluation) => void
}

/** Mostra un esercizio generico e raccoglie la risposta nella modalità richiesta. */
export function ExerciseCard({ exercise, answered, onAnswer }: Props) {
  const { prompt } = exercise
  return (
    <Card>
      {prompt.text && <p className="text-xl font-semibold">{prompt.text}</p>}
      {prompt.hint && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{prompt.hint}</p>
      )}
      {prompt.speak && (
        <div className="mt-4">
          <SpeakButton text={prompt.speak} rate={prompt.rate} autoplay={prompt.autoplay} />
        </div>
      )}
      <div className="mt-5">
        <AnswerInput exercise={exercise} answered={answered} onAnswer={onAnswer} />
      </div>
    </Card>
  )
}

function AnswerInput({ exercise, answered, onAnswer }: Props) {
  switch (exercise.answer.mode) {
    case 'type':
      return <TypeAnswer exercise={exercise} answered={answered} onAnswer={onAnswer} />
    case 'choice':
      return <ChoiceAnswer exercise={exercise} answered={answered} onAnswer={onAnswer} />
    case 'speak':
      return <SpeechAnswer exercise={exercise} answered={answered} onAnswer={onAnswer} />
    case 'selfgrade':
      return <SelfGradeAnswer exercise={exercise} answered={answered} onAnswer={onAnswer} />
  }
}

function TypeAnswer({ exercise, answered, onAnswer }: Props) {
  const [value, setValue] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!answered) onAnswer(evaluate(exercise, { kind: 'text', value }))
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="text"
        lang="en"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={answered}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-label="La tua risposta"
        placeholder="Scrivi qui…"
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-lg dark:border-slate-700 dark:bg-slate-950"
      />
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={answered || !value.trim()}>
          Verifica
        </Button>
        <Button
          variant="ghost"
          disabled={answered}
          onClick={() => onAnswer(evaluate(exercise, { kind: 'text', value: '' }))}
        >
          Non lo so
        </Button>
      </div>
    </form>
  )
}

function ChoiceAnswer({ exercise, answered, onAnswer }: Props) {
  const [picked, setPicked] = useState<string | null>(null)
  const choices = exercise.answer.choices ?? exercise.answer.accepted
  return (
    <div className="grid gap-2">
      {choices.map((choice) => {
        const isRight = exercise.answer.accepted.includes(choice)
        const state = !answered
          ? ''
          : isRight
            ? 'ring-2 ring-emerald-500'
            : picked === choice
              ? 'opacity-60 line-through'
              : 'opacity-60'
        return (
          <Button
            key={choice}
            variant="secondary"
            lang="en"
            disabled={answered}
            className={`text-left ${state}`}
            onClick={() => {
              setPicked(choice)
              onAnswer(evaluate(exercise, { kind: 'text', value: choice }))
            }}
          >
            {choice}
          </Button>
        )
      })}
    </div>
  )
}

function SpeechAnswer({ exercise, answered, onAnswer }: Props) {
  const settings = useSettings()
  const { start, cancel, listening, interim, error } = useListener()
  const [fallback, setFallback] = useState(!isSttSupported())

  const fallbackMode = exercise.answer.fallback ?? settings.sttFallback
  const fallbackNeeded =
    fallback || error === 'offline' || error === 'network' || error === 'not-supported'
  if (fallbackNeeded) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {error
            ? sttErrorMessage(error)
            : isSttSupported()
              ? 'Va bene, niente microfono.'
              : 'Il riconoscimento vocale non è disponibile qui.'}{' '}
          {fallbackMode === 'type'
            ? 'Dilla ad alta voce, poi scrivila.'
            : 'Dilla ad alta voce, poi valuta tu come è andata.'}
        </p>
        {fallbackMode === 'type' ? (
          <TypeAnswer exercise={exercise} answered={answered} onAnswer={onAnswer} />
        ) : (
          <SelfGradeAnswer exercise={exercise} answered={answered} onAnswer={onAnswer} />
        )}
      </div>
    )
  }

  const record = async () => {
    const result = await start()
    if (result) onAnswer(evaluate(exercise, { kind: 'speech', transcripts: result.transcripts }))
  }

  return (
    <div className="space-y-3">
      <Button
        className="flex w-full items-center justify-center gap-2"
        disabled={answered}
        onClick={() => (listening ? cancel() : void record())}
        aria-pressed={listening}
      >
        <Icon name={listening ? 'stop' : 'mic'} className="size-6" />
        {listening ? 'Ti ascolto… (tocca per fermare)' : 'Tocca e parla'}
      </Button>
      {listening && interim && (
        <p lang="en" className="text-center text-slate-500 italic">
          {interim}
        </p>
      )}
      {error && (
        <p className="text-sm text-amber-700 dark:text-amber-300">{sttErrorMessage(error)}</p>
      )}
      {!answered && (
        <button
          type="button"
          className="min-h-11 w-full text-sm text-slate-500 underline dark:text-slate-400"
          onClick={() => {
            cancel()
            setFallback(true)
          }}
        >
          Non posso parlare ora
        </button>
      )}
    </div>
  )
}

const SELF_GRADE_BUTTONS: { grade: SelfGrade; label: string }[] = [
  { grade: 'again', label: 'Non la sapevo' },
  { grade: 'hard', label: 'Con fatica' },
  { grade: 'good', label: 'Bene' },
  { grade: 'easy', label: 'Facile' },
]

function SelfGradeAnswer({ exercise, answered, onAnswer }: Props) {
  const [revealed, setRevealed] = useState(false)
  const answer = exercise.answer.reveal ?? exercise.answer.accepted[0] ?? ''
  const say = exercise.say ?? answer
  if (!revealed) {
    return (
      <Button variant="secondary" className="w-full" onClick={() => setRevealed(true)}>
        Mostra la risposta
      </Button>
    )
  }
  return (
    <div className="space-y-3">
      <p
        lang="en"
        className="rounded-xl bg-slate-100 p-3 text-lg font-medium whitespace-pre-line dark:bg-slate-800"
      >
        {answer}
      </p>
      <SpeakButton text={say} />
      <p className="text-sm text-slate-600 dark:text-slate-300">Com’è andata?</p>
      <div className="grid grid-cols-2 gap-2">
        {SELF_GRADE_BUTTONS.map(({ grade, label }) => (
          <Button
            key={grade}
            variant="secondary"
            disabled={answered}
            onClick={() => onAnswer(evaluate(exercise, { kind: 'self', grade }))}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  )
}
