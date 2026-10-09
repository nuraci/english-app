import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings } from '../../core/db/settings'
import { activePacksOf } from '../../core/packs'
import { createRng } from '../../core/random'
import { BackLink } from '../../ui/BackLink'
import { Card, Screen } from '../../ui/Screen'
import { formatDuration } from './analysis'
import { checklist, type Question } from './data'
import { QuestionStep, type StepResult } from './QuestionStep'
import { buildInterviewPlan } from './session'
import {
  finishInterviewSession,
  getMyAnswers,
  practiceCounts,
  saveAttempt,
  startInterviewSession,
} from './storage'

type Done = { question: Question; result: StepResult }

export function InterviewSessionScreen() {
  const [plan, setPlan] = useState<Question[] | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState<Done[]>([])
  const sessionId = useRef<Promise<number> | null>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([practiceCounts(), getMyAnswers(), getSettings()]).then(
      ([counts, mine, settings]) => {
        if (!alive) return
        setAnswers(mine)
        setPlan(
          buildInterviewPlan(counts, createRng(Date.now()), activePacksOf(settings.activePacks)),
        )
      },
    )
    return () => {
      alive = false
    }
  }, [])

  const next = async (question: Question, result: StepResult) => {
    // La sessione si crea alla prima risposta: chi apre e chiude subito non lascia prove vuote.
    sessionId.current ??= startInterviewSession(plan?.length ?? 0)
    const id = await sessionId.current
    await saveAttempt(
      {
        sessionId: id,
        questionId: question.id,
        question: question.text,
        transcript: result.transcript,
        durationMs: result.durationMs,
        checklist: result.checklist,
        keywordsHit: result.keywordsHit,
      },
      result.recording,
    )
    const all = [...done, { question, result }]
    setDone(all)
    if (plan && index + 1 >= plan.length) await finishInterviewSession(id, all.length)
    setIndex((i) => i + 1)
  }

  const current = plan?.[index]

  return (
    <Screen title="Prova di colloquio">
      <BackLink to="/allenamenti/colloquio" label="Colloquio" />
      {!plan ? (
        <p>Preparo le domande…</p>
      ) : current ? (
        <QuestionStep
          key={current.id}
          question={current}
          index={index}
          total={plan.length}
          prepared={answers[current.id]}
          onNext={(r) => void next(current, r)}
        />
      ) : (
        <Card>
          <p className="text-2xl font-bold">Colloquio completato! 🎉</p>
          <p className="mt-2">
            Hai risposto a {done.length} domande in inglese, ad alta voce. È esattamente
            l’allenamento che serve.
          </p>
          <ol className="mt-4 space-y-3">
            {done.map(({ question, result }) => (
              <li key={question.id}>
                <p lang="en" className="font-semibold">
                  {question.text}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  ⏱️ {formatDuration(result.durationMs)} · ✅ {result.checklist.length}/
                  {checklist.length} · parole chiave {result.keywordsHit.length}/
                  {question.keywords.length}
                </p>
              </li>
            ))}
          </ol>
          <Link
            to="/allenamenti/colloquio/storico"
            className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            Riascolta le tue risposte
          </Link>
        </Card>
      )}
    </Screen>
  )
}
