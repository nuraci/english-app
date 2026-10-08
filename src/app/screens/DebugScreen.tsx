import { useEffect, useReducer, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../core/db/db'
import {
  buildFeedback,
  createSession,
  currentExercise,
  saveAnswer,
  sessionReducer,
  sessionScore,
  type Evaluation,
} from '../../core/session'
import {
  getOnDeviceStatus,
  installOnDevice,
  isSttSupported,
  isTtsSupported,
  sttErrorMessage,
  useListener,
  useSpeaker,
  type OnDeviceStatus,
} from '../../core/speech'
import { useSettings } from '../../core/db/settings'
import { getDueItems } from '../../core/srs'
import { debugExercises, debugSentence } from '../../content'
import { Button } from '../../ui/Button'
import { ExerciseCard } from '../../ui/exercise/ExerciseCard'
import { Feedback } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Card, Screen } from '../../ui/Screen'

/** Pagina di prova del motore comune: voce, microfono, valutazione e ripasso. */
export function DebugScreen() {
  return (
    <Screen title="Prova voce e microfono">
      <Link
        to="/impostazioni"
        className="-mt-4 inline-flex min-h-11 items-center gap-1 text-teal-700 dark:text-teal-300"
      >
        <Icon name="back" className="size-5" /> Impostazioni
      </Link>
      <TtsTest />
      <SttTest />
      <SessionTest />
    </Screen>
  )
}

function TtsTest() {
  const [text, setText] = useState(debugSentence)
  const { speak, stop, speaking } = useSpeaker()
  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">1. Lettura (TTS)</h2>
      {!isTtsSupported() && <p className="mb-2 text-amber-700">Sintesi vocale non disponibile.</p>}
      <textarea
        lang="en"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        aria-label="Testo da leggere"
        className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => (speaking ? stop() : void speak(text))}>
          {speaking ? 'Stop' : 'Leggi'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => void speak(text.split(/(?<=[.!?])\s+/).filter(Boolean))}
        >
          Frase per frase
        </Button>
      </div>
    </Card>
  )
}

const ON_DEVICE_LABELS: Record<OnDeviceStatus, string> = {
  available: 'installato: funziona anche offline ✅',
  downloadable: 'scaricabile',
  downloading: 'download in corso…',
  unavailable: 'non disponibile su questo telefono',
  unsupported: 'non supportato da questo browser',
}

function SttTest() {
  const settings = useSettings()
  const { start, cancel, listening, interim, error } = useListener()
  const [transcripts, setTranscripts] = useState<string[]>([])
  const [onDevice, setOnDevice] = useState<OnDeviceStatus | null>(null)

  useEffect(() => {
    void getOnDeviceStatus(settings.accent).then(setOnDevice)
  }, [settings.accent])

  const install = async () => {
    setOnDevice('downloading')
    await installOnDevice(settings.accent)
    setOnDevice(await getOnDeviceStatus(settings.accent))
  }

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">2. Riconoscimento (STT)</h2>
      <dl className="mb-3 space-y-1 text-sm">
        <div>
          <dt className="inline text-slate-500">Supportato: </dt>
          <dd className="inline">{isSttSupported() ? 'sì' : 'no'}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Pacchetto offline {settings.accent}: </dt>
          <dd className="inline">{onDevice ? ON_DEVICE_LABELS[onDevice] : '…'}</dd>
        </div>
      </dl>
      {onDevice === 'downloadable' && (
        <Button variant="secondary" className="mb-3 w-full" onClick={() => void install()}>
          Scarica l’inglese per l’uso offline
        </Button>
      )}
      <Button
        className="flex w-full items-center justify-center gap-2"
        disabled={!isSttSupported()}
        onClick={async () => {
          if (listening) return cancel()
          const r = await start()
          setTranscripts(r?.transcripts ?? [])
        }}
      >
        <Icon name={listening ? 'stop' : 'mic'} className="size-6" />
        {listening ? 'Ti ascolto…' : 'Parla in inglese'}
      </Button>
      {listening && interim && (
        <p lang="en" className="mt-2 italic text-slate-500">
          {interim}
        </p>
      )}
      {error && <p className="mt-2 text-amber-700 dark:text-amber-300">{sttErrorMessage(error)}</p>}
      {transcripts.length > 0 && (
        <ol lang="en" className="mt-3 list-decimal space-y-1 pl-6" aria-label="Trascrizioni">
          {transcripts.map((t, i) => (
            <li key={i} className={i === 0 ? 'font-semibold' : 'text-slate-500'}>
              {t}
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function SessionTest() {
  const [state, dispatch] = useReducer(sessionReducer, debugExercises, (ex) => createSession(ex))
  const [due, setDue] = useState<number | null>(null)
  const exercise = currentExercise(state)

  const refreshDue = () => void getDueItems('debug', 100).then((items) => setDue(items.length))
  useEffect(refreshDue, [])

  const answer = async (evaluation: Evaluation) => {
    if (!exercise) return
    dispatch({ type: 'answer', evaluation })
    await saveAnswer(exercise, evaluation)
    refreshDue()
  }

  const reset = async () => {
    await db.items.where('module').equals('debug').delete()
    await db.reviews.where('module').equals('debug').delete()
    dispatch({ type: 'restart', now: Date.now() })
    refreshDue()
  }

  return (
    <section className="space-y-4" aria-labelledby="session-title">
      <h2 id="session-title" className="text-lg font-bold">
        3. Esercizi di prova{' '}
        <span className="font-normal text-slate-500">
          {Math.min(state.index + 1, state.exercises.length)}/{state.exercises.length}
        </span>
      </h2>
      {exercise ? (
        <>
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            answered={!!state.current}
            onAnswer={(e) => void answer(e)}
          />
          {state.current && (
            <Feedback
              message={buildFeedback(state.current, state.index)}
              explanation={exercise.explanation}
              onContinue={() => dispatch({ type: 'next' })}
            />
          )}
        </>
      ) : (
        <Card>
          <p className="text-lg font-semibold">Finito! 🎉</p>
          <p className="mt-1">
            {sessionScore(state).correct} su {sessionScore(state).total} al primo colpo.
          </p>
          <Button
            className="mt-4 w-full"
            onClick={() => dispatch({ type: 'restart', now: Date.now() })}
          >
            Ricomincia
          </Button>
        </Card>
      )}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Da ripassare adesso (SRS): {due ?? '…'} ·{' '}
        <button type="button" className="min-h-11 underline" onClick={() => void reset()}>
          azzera
        </button>
      </p>
    </section>
  )
}
