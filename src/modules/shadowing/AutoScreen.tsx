import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../../core/db/settings'
import { createRng, shuffle } from '../../core/random'
import { saveSession } from '../../core/session'
import {
  keepScreenOn,
  speakBatch,
  startBackgroundSession,
  type BackgroundSession,
  type WakeLockHandle,
} from '../../core/speech'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Card, Screen } from '../../ui/Screen'
import { buildAutoSegments, DEFAULT_AUTO, type AutoOptions } from './auto'
import type { ShadowItem } from './sources'
import { useShadowSource } from './useShadowSource'

const PAUSES: [number, string][] = [
  [1, 'Breve'],
  [1.3, 'Media'],
  [1.8, 'Lunga'],
]

/** Modalità auto: playlist solo audio, a mani libere, anche con lo schermo spento. */
export function AutoScreen() {
  const [params] = useSearchParams()
  const source = useShadowSource(params.get('source'))
  const settings = useSettings()
  const [options, setOptions] = useState<AutoOptions>(DEFAULT_AUTO)
  const [shuffled, setShuffled] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState(0)
  const [items, setItems] = useState<ShadowItem[]>([])
  // Playlist e posizione anche in ref: i comandi della schermata di blocco le leggono fuori da React.
  const listRef = useRef<ShadowItem[]>([])
  const currentRef = useRef(0)
  const cancelBatch = useRef<(() => void) | null>(null)
  const background = useRef<BackgroundSession | null>(null)
  const wakeLock = useRef<WakeLockHandle | null>(null)

  const startedAt = useRef(0)

  const stopAll = () => {
    if (startedAt.current) {
      const heard = currentRef.current + 1
      void saveSession({
        module: 'shadowing',
        startedAt: startedAt.current,
        total: heard,
        correct: heard,
      })
      startedAt.current = 0
    }
    cancelBatch.current?.()
    cancelBatch.current = null
    background.current?.stop()
    background.current = null
    void wakeLock.current?.release()
    wakeLock.current = null
    setRunning(false)
  }

  useEffect(
    () => () => {
      cancelBatch.current?.()
      background.current?.stop()
      void wakeLock.current?.release()
    },
    [],
  )

  if (source === undefined) return null
  if (!source) {
    return (
      <Screen title="Modalità auto">
        <BackLink to="/allenamenti/shadowing" label="Shadowing" />
        <Card>Sorgente non trovata.</Card>
      </Screen>
    )
  }

  const playFrom = async (start: number) => {
    cancelBatch.current?.()
    const list = listRef.current
    const segments = buildAutoSegments(list.slice(start), options).map((s) => ({
      ...s,
      item: (s.item ?? 0) + start,
    }))
    const batch = await speakBatch(segments, {
      accent: settings.accent,
      rate: settings.rate,
      voiceURI: settings.voiceURI,
      onSegment: (_, segment) => {
        const i = segment.item ?? 0
        currentRef.current = i
        setCurrent(i)
        background.current?.setTitle(list[i]?.text ?? source.name)
      },
    })
    cancelBatch.current = batch.cancel
    if (await batch.done) stopAll()
  }

  const next = () => void playFrom(Math.min(listRef.current.length - 1, currentRef.current + 1))
  const previous = () => void playFrom(Math.max(0, currentRef.current - 1))

  const start = async () => {
    const list = shuffled ? shuffle(source.items, createRng(Date.now())) : source.items
    listRef.current = list
    currentRef.current = 0
    startedAt.current = Date.now()
    setItems(list)
    setCurrent(0)
    setRunning(true)
    // Media Session e audio silenzioso vanno avviati dentro il tocco dell'utente.
    background.current = await startBackgroundSession(source.name, {
      onStop: stopAll,
      onNext: next,
      onPrevious: previous,
    })
    if (screenOn) wakeLock.current = await keepScreenOn()
    await playFrom(0)
  }

  const list = items.length ? items : source.items
  const item = list[current]

  return (
    <Screen title="Modalità auto 🚗">
      <BackLink to="/allenamenti/shadowing" label="Shadowing" />
      <p className="font-semibold">{source.name}</p>
      {running ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Frase {current + 1} di {list.length}
          </p>
          <p
            lang="en"
            className="mt-2 text-2xl leading-snug font-semibold"
            data-testid="auto-sentence"
          >
            {item?.text}
          </p>
          {item?.translation && options.translation && (
            <p className="mt-2 text-slate-600 dark:text-slate-300">{item.translation}</p>
          )}
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {screenOn
              ? 'Lo schermo resta acceso.'
              : 'Puoi spegnere lo schermo: la lettura continua. Comandi anche dalla schermata di blocco.'}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={previous} aria-label="Frase precedente">
              ‹
            </Button>
            <Button onClick={stopAll}>Stop</Button>
            <Button variant="secondary" onClick={next} aria-label="Frase successiva">
              ›
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-slate-600 dark:text-slate-300">
            Frase in inglese → pausa per ripeterla → (di nuovo) → traduzione. Perfetta per la
            macchina: niente da toccare.
          </p>
          <fieldset className="mt-4">
            <legend className="font-semibold">Ascolti per frase</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <Button
                  key={n}
                  variant={options.repetitions === n ? 'primary' : 'secondary'}
                  aria-pressed={options.repetitions === n}
                  onClick={() => setOptions((o) => ({ ...o, repetitions: n }))}
                >
                  {n}
                </Button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="font-semibold">Pausa per ripetere</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PAUSES.map(([value, label]) => (
                <Button
                  key={label}
                  variant={options.pause === value ? 'primary' : 'secondary'}
                  aria-pressed={options.pause === value}
                  onClick={() => setOptions((o) => ({ ...o, pause: value }))}
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 flex min-h-11 items-center justify-between gap-3">
            Traduzione in italiano (se c’è)
            <input
              type="checkbox"
              className="size-6 accent-teal-700"
              checked={options.translation}
              onChange={(e) => setOptions((o) => ({ ...o, translation: e.target.checked }))}
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3">
            Ordine casuale
            <input
              type="checkbox"
              className="size-6 accent-teal-700"
              checked={shuffled}
              onChange={(e) => setShuffled(e.target.checked)}
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3">
            Tieni lo schermo acceso
            <input
              type="checkbox"
              className="size-6 accent-teal-700"
              checked={screenOn}
              onChange={(e) => setScreenOn(e.target.checked)}
            />
          </label>
          <Button className="mt-4 w-full" onClick={() => void start()}>
            ▶ Avvia ({source.items.length} frasi)
          </Button>
        </Card>
      )}
    </Screen>
  )
}
