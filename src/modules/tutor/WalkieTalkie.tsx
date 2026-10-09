import { useRef, useState, type KeyboardEvent } from 'react'
import { useSettings } from '../../core/db/settings'
import {
  isSttSupported,
  SttError,
  startDictation,
  sttErrorMessage,
  tts,
  type Dictation,
  type SttErrorCode,
} from '../../core/speech'
import { Button } from '../../ui/Button'
import { Icon } from '../../ui/Icon'

type Props = { disabled: boolean; onText: (text: string) => void }

/** Tasto "parla" stile walkie-talkie: tieni premuto per parlare, rilascia per inviare. */
export function WalkieTalkie({ disabled, onText }: Props) {
  const settings = useSettings()
  const [talking, setTalking] = useState(false)
  const [live, setLive] = useState('')
  const [error, setError] = useState<SttErrorCode | null>(null)
  const [typing, setTyping] = useState(!isSttSupported())
  const [draft, setDraft] = useState('')
  const dictation = useRef<Dictation | null>(null)
  const starting = useRef<Promise<void> | null>(null)

  const start = () => {
    if (disabled || talking) return
    tts.cancel()
    setError(null)
    setLive('')
    setTalking(true)
    starting.current = startDictation({ lang: settings.accent, onText: setLive, onError: setError })
      .then((d) => {
        dictation.current = d
      })
      .catch((e: unknown) => {
        setError(e instanceof SttError ? e.code : 'unknown')
        setTalking(false)
      })
  }

  const stop = async () => {
    if (!talking) return
    await starting.current
    const text = ((await dictation.current?.stop()) ?? '').trim()
    dictation.current = null
    setTalking(false)
    setLive('')
    if (text) onText(text)
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (talking) void stop()
    else start()
  }

  if (typing || error === 'not-supported' || error === 'offline' || error === 'network') {
    return (
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.trim()) onText(draft.trim())
          setDraft('')
        }}
      >
        {error && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{sttErrorMessage(error)}</p>
        )}
        <textarea
          lang="en"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="La tua risposta"
          placeholder="Scrivi in inglese…"
          className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
        />
        <Button type="submit" className="w-full" disabled={disabled || !draft.trim()}>
          Invia
        </Button>
        {isSttSupported() && (
          <button
            type="button"
            className="min-h-11 w-full text-sm text-teal-700 underline dark:text-teal-300"
            onClick={() => setTyping(false)}
          >
            Torna al microfono
          </button>
        )}
      </form>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {talking && (
        <p
          lang="en"
          className="min-h-6 text-center text-slate-600 italic dark:text-slate-300"
          aria-live="polite"
        >
          {live || 'Ti ascolto…'}
        </p>
      )}
      {error && (
        <p className="text-sm text-amber-700 dark:text-amber-300">{sttErrorMessage(error)}</p>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-pressed={talking}
        aria-label={talking ? 'Rilascia per inviare' : 'Tieni premuto per parlare'}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          start()
        }}
        onPointerUp={() => void stop()}
        onPointerCancel={() => void stop()}
        onKeyDown={onKey}
        onContextMenu={(e) => e.preventDefault()}
        className={`flex size-20 touch-none items-center justify-center rounded-full text-white shadow-lg transition select-none disabled:opacity-40 ${
          talking ? 'scale-110 bg-rose-600' : 'bg-teal-700 dark:bg-teal-500 dark:text-slate-950'
        }`}
      >
        <Icon name="mic" className="size-10" />
      </button>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {talking ? 'Rilascia per inviare' : 'Tieni premuto per parlare'}
      </p>
      <button
        type="button"
        className="min-h-11 text-sm text-teal-700 underline dark:text-teal-300"
        onClick={() => setTyping(true)}
      >
        Preferisco scrivere
      </button>
    </div>
  )
}
