import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSpeaker } from '../../core/speech'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Card, Screen } from '../../ui/Screen'
import {
  OPENERS,
  sendTurn,
  TutorError,
  tutorErrorMessage,
  type Correction,
  type Quota,
  type TutorErrorItem,
} from './client'
import { INTERVIEW_HARD_STOP_MINUTES, INTERVIEW_MINUTES, modes, type TutorMode } from './data'
import { errorsToSrs, type SrsMatch } from './srs'
import { historyFor, saveTutorSummary } from './storage'
import { UsageLine } from './TutorScreen'
import { WalkieTalkie } from './WalkieTalkie'

type Turn = {
  role: 'user' | 'assistant'
  text: string
  raw?: string
  hidden?: boolean
  corrections?: Correction[]
}
type Finished = {
  summary: string
  corrections: Correction[]
  added: SrsMatch[]
  costUsd: number
  minutes: number
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function TutorChatScreen() {
  const [params] = useSearchParams()
  const mode: TutorMode = params.get('mode') === 'conversation' ? 'conversation' : 'interview'
  const topic = params.get('topic') ?? undefined
  const { speak } = useSpeaker()

  const [turns, setTurns] = useState<Turn[]>([{ role: 'user', text: OPENERS[mode], hidden: true }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [finished, setFinished] = useState<Finished | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [retry, setRetry] = useState<{ list: Turn[]; finish: boolean } | null>(null)
  // Fissato all'apertura (nell'effetto più sotto): il render non legge mai l'orologio.
  const startedAt = useRef(0)
  const errors = useRef<TutorErrorItem[]>([])
  const cost = useRef(0)
  const started = useRef(false)
  const bottom = useRef<HTMLDivElement | null>(null)

  // Ogni nuovo messaggio resta visibile sopra il pannello del microfono.
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' })
  }, [turns.length, busy])

  useEffect(() => {
    const t = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 1000)
    return () => clearInterval(t)
  }, [])

  const finalize = async (list: Turn[], summary: string) => {
    const corrections = list.flatMap((t) => t.corrections ?? [])
    const added = await errorsToSrs(errors.current)
    const endedAt = Date.now()
    await saveTutorSummary({
      mode,
      topic,
      startedAt: startedAt.current,
      endedAt,
      summary,
      corrections,
      transcript: list.filter((t) => !t.hidden).map((t) => ({ role: t.role, text: t.text })),
      addedToReview: added,
      costUsd: cost.current,
    })
    setFinished({
      summary,
      corrections,
      added,
      costUsd: cost.current,
      minutes: Math.round((endedAt - startedAt.current) / 60000),
    })
  }

  const call = async (list: Turn[], finish = false) => {
    setBusy(true)
    setError(null)
    setRetry(null)
    try {
      const res = await sendTurn({
        mode,
        topic,
        messages: historyFor(list),
        elapsedMinutes:
          mode === 'interview' ? Math.floor((Date.now() - startedAt.current) / 60000) : undefined,
        finish,
      })
      errors.current.push(...res.errors)
      cost.current += res.usage?.costUsd ?? 0
      setQuota(res.quota)
      // Le correzioni riguardano l'ultimo turno dell'utente.
      const withCorrections = list.map((t, i) =>
        i === list.length - 1 && t.role === 'user' && !t.hidden
          ? { ...t, corrections: res.corrections }
          : t,
      )
      const next: Turn[] = [
        ...withCorrections,
        { role: 'assistant', text: res.reply, raw: res.raw },
      ]
      setTurns(next)
      void speak(res.reply)
      if (finish || res.interview_over) await finalize(next, res.summary_it)
    } catch (e) {
      setError(tutorErrorMessage(e instanceof TutorError ? e.code : 'server'))
      setRetry({ list, finish })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    startedAt.current = Date.now()
    void call(turns)
    // Solo all'apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onUserText = (text: string) => {
    const list: Turn[] = [...turns, { role: 'user', text }]
    setTurns(list)
    const overtime =
      mode === 'interview' &&
      (Date.now() - startedAt.current) / 60000 >= INTERVIEW_HARD_STOP_MINUTES
    void call(list, overtime)
  }

  if (finished) {
    return (
      <Screen title="Riepilogo">
        <Card>
          <p className="text-2xl font-bold">
            {mode === 'interview' ? 'Colloquio finito! 🎉' : 'Bella chiacchierata! 🎉'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {finished.minutes} minuti · ≈ ${finished.costUsd.toFixed(2)}
          </p>
          {finished.summary && (
            <p className="mt-3" data-testid="tutor-summary">
              {finished.summary}
            </p>
          )}
        </Card>
        {finished.corrections.length > 0 && (
          <Card>
            <h2 className="text-lg font-bold">Da ricordare</h2>
            <ul className="mt-2 space-y-3">
              {finished.corrections.map((c, i) => (
                <li key={i}>
                  <span lang="en" className="line-through opacity-70">
                    {c.you_said}
                  </span>{' '}
                  → <strong lang="en">{c.better}</strong>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{c.explanation_it}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {finished.added.length > 0 && (
          <Card>
            <p data-testid="tutor-added">
              Aggiunti ai tuoi ripassi:{' '}
              <strong lang="en">{finished.added.map((a) => a.label).join(', ')}</strong>. Li
              ritroverai nei prossimi allenamenti.
            </p>
          </Card>
        )}
        <Link
          to="/allenamenti/tutor"
          className="flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
        >
          Torna al tutor
        </Link>
      </Screen>
    )
  }

  const visible = turns.filter((t) => !t.hidden)
  const remaining = INTERVIEW_MINUTES * 60000 - elapsedMs

  return (
    <Screen title={modes[mode].title}>
      <BackLink to="/allenamenti/tutor" label="Tutor AI" />
      <div className="flex items-center justify-between gap-2">
        {mode === 'interview' ? (
          <p
            className={`font-mono text-lg ${remaining < 120000 ? 'text-amber-700 dark:text-amber-300' : ''}`}
            data-testid="tutor-timer"
          >
            ⏱️ {remaining > 0 ? clock(remaining) : `+${clock(-remaining)}`}
          </p>
        ) : (
          <p className="text-sm text-slate-500">{topic}</p>
        )}
        <Button
          variant="secondary"
          disabled={busy || visible.length < 2}
          onClick={() => void call(turns, true)}
        >
          Termina
        </Button>
      </div>
      <UsageLine quota={quota} />

      <ol className="space-y-3" aria-live="polite" data-testid="tutor-chat">
        {visible.map((t, i) => (
          <li key={i} className={t.role === 'assistant' ? 'mr-8' : 'ml-8'}>
            <div
              lang="en"
              className={`rounded-2xl p-3 ${t.role === 'assistant' ? 'bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800' : 'bg-teal-50 dark:bg-teal-950'}`}
            >
              {t.text}
            </div>
            {t.corrections && t.corrections.length > 0 && (
              <ul
                className="mt-1 space-y-1 rounded-xl bg-amber-50 p-2 text-sm dark:bg-amber-950/50"
                data-testid="tutor-corrections"
              >
                {t.corrections.map((c, j) => (
                  <li key={j}>
                    💡{' '}
                    <span lang="en">
                      «{c.you_said}» → «{c.better}»
                    </span>
                    : {c.explanation_it}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {busy && <li className="mr-8 text-slate-500">…</li>}
      </ol>

      <div ref={bottom} />

      {error && (
        <Card>
          <p role="alert">{error}</p>
          {retry && (
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => void call(retry.list, retry.finish)}
            >
              Riprova
            </Button>
          )}
        </Card>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 pt-3 pb-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <WalkieTalkie disabled={busy} onText={onUserText} />
      </div>
    </Screen>
  )
}
