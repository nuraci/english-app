import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../../core/db/settings'
import { saveSession } from '../../core/session'
import { isRecordingSupported, speakBatch, startRecording, type Recorder } from '../../core/speech'
import { AudioPlayer } from '../../ui/AudioPlayer'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/Icon'
import { Card, Screen } from '../../ui/Screen'
import { useShadowSource } from './useShadowSource'

const REPEAT_OPTIONS = [1, 3, 5]

/** Player frase per frase: ascolta, rallenta, ripeti N volte, registrati e confronta. */
export function PlayerScreen() {
  const [params] = useSearchParams()
  const source = useShadowSource(params.get('source'))
  const settings = useSettings()
  const [index, setIndex] = useState(0)
  const [repeat, setRepeat] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [recording, setRecording] = useState(false)
  const [mine, setMine] = useState<Record<number, Blob>>({})
  const cancel = useRef<(() => void) | null>(null)
  const recorder = useRef<Recorder | null>(null)
  /** Frasi ascoltate in questa visita: uscendo diventano una sessione (serie, XP, statistiche). */
  const practiced = useRef(new Set<number>())
  const startedAt = useRef(0)

  useEffect(() => {
    startedAt.current = Date.now()
    const done = practiced.current
    return () => {
      cancel.current?.()
      recorder.current?.cancel()
      if (done.size > 0) {
        void saveSession({
          module: 'shadowing',
          startedAt: startedAt.current,
          total: done.size,
          correct: done.size,
        })
      }
    }
  }, [])

  if (source === undefined) return null
  if (!source || source.items.length === 0) {
    return (
      <Screen title="Shadowing">
        <BackLink to="/allenamenti/shadowing" label="Shadowing" />
        <Card>Sorgente non trovata.</Card>
      </Screen>
    )
  }
  const item = source.items[index] ?? source.items[0]
  if (!item) return null

  const play = async (times: number, rate = 1) => {
    cancel.current?.()
    practiced.current.add(index)
    // Ogni ascolto è seguito da una pausa silenziosa lunga quanto la frase: il tempo per ripeterla.
    const segments = Array.from({ length: times }, () => [
      { text: item.text, rate },
      { text: item.text, volume: 0, rate: rate * 0.8 },
    ]).flat()
    if (times === 1) segments.pop()
    setPlaying(true)
    const batch = await speakBatch(segments, {
      accent: settings.accent,
      rate: settings.rate,
      voiceURI: settings.voiceURI,
    })
    cancel.current = batch.cancel
    await batch.done
    setPlaying(false)
  }

  const stop = () => {
    cancel.current?.()
    setPlaying(false)
  }

  const toggleRecord = async () => {
    if (recording) {
      const result = await recorder.current?.stop()
      recorder.current = null
      setRecording(false)
      if (result && result.blob.size > 0) setMine((m) => ({ ...m, [index]: result.blob }))
      return
    }
    stop()
    try {
      recorder.current = await startRecording()
      setRecording(true)
    } catch {
      setRecording(false)
    }
  }

  const compare = async () => {
    const blob = mine[index]
    if (!blob) return
    await play(1)
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)
    void audio.play()
  }

  const go = (delta: number) => {
    stop()
    setIndex((i) => Math.min(source.items.length - 1, Math.max(0, i + delta)))
  }

  return (
    <Screen title={source.name}>
      <BackLink to="/allenamenti/shadowing" label="Shadowing" />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Frase {index + 1} di {source.items.length}
      </p>
      <Card>
        <p lang="en" className="text-2xl leading-snug font-semibold" data-testid="shadow-sentence">
          {item.text}
        </p>
        {item.translation &&
          (showTranslation ? (
            <p className="mt-2 text-slate-600 dark:text-slate-300">{item.translation}</p>
          ) : (
            <button
              type="button"
              className="mt-2 min-h-11 text-sm text-teal-700 underline dark:text-teal-300"
              onClick={() => setShowTranslation(true)}
            >
              Mostra la traduzione
            </button>
          ))}

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <Button
            className="flex items-center justify-center gap-2"
            onClick={() => (playing ? stop() : void play(1))}
          >
            <Icon name={playing ? 'stop' : 'speaker'} className="size-5" />{' '}
            {playing ? 'Stop' : 'Ascolta'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void play(1, 0.7)}
            aria-label="Ascolta lentamente"
          >
            🐢
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => void play(repeat)}>
            Ripeti ×{repeat}
          </Button>
          <div role="group" aria-label="Quante volte" className="flex gap-1">
            {REPEAT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={repeat === n}
                onClick={() => setRepeat(n)}
                className={`size-11 rounded-lg font-semibold ${repeat === n ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {isRecordingSupported() && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button
              variant={recording ? 'primary' : 'secondary'}
              className="flex w-full items-center justify-center gap-2"
              onClick={() => void toggleRecord()}
              aria-pressed={recording}
            >
              <Icon name={recording ? 'stop' : 'mic'} className="size-5" />
              {recording ? 'Ferma la registrazione' : 'Registrati mentre la dici'}
            </Button>
            {mine[index] && (
              <div className="mt-3 space-y-2">
                <AudioPlayer blob={mine[index]} label="La tua voce" />
                <Button variant="secondary" className="w-full" onClick={() => void compare()}>
                  Confronta: originale, poi tu
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={index === 0} onClick={() => go(-1)}>
          ‹ Precedente
        </Button>
        <Button
          variant="secondary"
          disabled={index >= source.items.length - 1}
          onClick={() => go(1)}
        >
          Successiva ›
        </Button>
      </div>
    </Screen>
  )
}
