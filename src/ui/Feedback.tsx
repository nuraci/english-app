import type { FeedbackMessage } from '../core/session'
import { Button } from './Button'
import { Icon } from './Icon'
import { SpeakButton } from './exercise/SpeakButton'

const TONE_STYLES = {
  success:
    'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-800',
  almost:
    'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-800',
  retry:
    'bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-100 dark:ring-sky-800',
} as const

type Props = {
  message: FeedbackMessage
  /** Spiegazione dell'esercizio, in italiano. */
  explanation?: string
  onContinue?: () => void
  continueLabel?: string
  /** Testo da riascoltare (es. le tre forme del verbo). */
  speak?: string
}

/** Feedback incoraggiante: titolo, dettaglio sull'errore e spiegazione. */
export function Feedback({
  message,
  explanation,
  onContinue,
  continueLabel = 'Continua',
  speak,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl p-4 ring-1 ${TONE_STYLES[message.tone]}`}
    >
      <p className="flex items-center gap-2 text-lg font-bold">
        <Icon name={message.tone === 'success' ? 'check' : 'sparkle'} className="size-6 shrink-0" />
        {message.title}
      </p>
      {message.detail && <p className="mt-1">{message.detail}</p>}
      {explanation && <p className="mt-3 text-sm opacity-90">💡 {explanation}</p>}
      {speak && (
        <div className="mt-3">
          <SpeakButton text={speak} />
        </div>
      )}
      {onContinue && (
        <Button className="mt-4 w-full" onClick={onContinue} autoFocus>
          {continueLabel}
        </Button>
      )}
    </div>
  )
}
