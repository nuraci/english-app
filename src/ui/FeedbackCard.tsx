import { useState } from 'react'
import { sendFeedback } from '../modules/tutor/feedback'
import { Button } from './Button'

/** Raccolta di suggerimenti dentro l'app, per la beta. */
export function FeedbackCard() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const submit = async () => {
    const result = await sendFeedback(text.trim(), {
      page: 'impostazioni',
      version: __APP_VERSION__,
    })
    setText('')
    setStatus(
      result === 'sent'
        ? 'Grazie! Il tuo suggerimento è arrivato. 🙏'
        : 'Grazie! L’ho salvato sul telefono: lo invierò appena il tutor sarà collegato.',
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor="feedback" className="block text-sm text-slate-600 dark:text-slate-300">
        Cosa ti piace, cosa non funziona, cosa manca? Ogni idea aiuta.
      </label>
      <textarea
        id="feedback"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
      />
      <Button className="w-full" disabled={!text.trim()} onClick={() => void submit()}>
        Invia il suggerimento
      </Button>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </div>
  )
}
