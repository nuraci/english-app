import { useState } from 'react'
import { sttErrorMessage } from '../../core/speech'
import { AudioPlayer } from '../../ui/AudioPlayer'
import { Button } from '../../ui/Button'
import { SpeakButton } from '../../ui/exercise/SpeakButton'
import { Icon } from '../../ui/Icon'
import { Card } from '../../ui/Screen'
import { durationComment, formatDuration, keywordsHit, wordsPerMinute } from './analysis'
import { categoryNames, checklist, type Question } from './data'
import { useAnswerRecorder, type AnswerResult } from './useAnswerRecorder'

export type StepResult = AnswerResult & { checklist: string[]; keywordsHit: string[] }

type Props = {
  question: Question
  index: number
  total: number
  /** Risposta preparata dall'utente, da sbirciare. */
  prepared?: string
  onNext: (result: StepResult) => void
}

/** Una domanda della prova: ascolta, rispondi a voce, rivedi e valutati. */
export function QuestionStep({ question, index, total, prepared, onNext }: Props) {
  const rec = useAnswerRecorder()
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [checked, setChecked] = useState<string[]>([])
  const [showText, setShowText] = useState(false)
  const [showIt, setShowIt] = useState(false)

  const finish = async () => setResult(await rec.stop())
  const hits = result ? keywordsHit(result.transcript, question.keywords) : []
  const missing = question.keywords.filter((k) => !hits.includes(k))
  const wpm = result ? wordsPerMinute(result.transcript, result.durationMs) : null

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
          Domanda {index + 1} di {total} · {categoryNames[question.category]}
        </p>
        <div className="mt-3">
          <SpeakButton text={question.text} rate={0.95} autoplay />
        </div>
        {showText ? (
          <p lang="en" className="mt-3 text-xl font-semibold">
            {question.text}
          </p>
        ) : (
          <button
            type="button"
            className="mt-2 min-h-11 text-teal-700 underline dark:text-teal-300"
            onClick={() => setShowText(true)}
          >
            Mostra il testo della domanda
          </button>
        )}
        {showText &&
          (showIt ? (
            <p className="mt-1 text-slate-600 dark:text-slate-300">{question.it}</p>
          ) : (
            <button
              type="button"
              className="min-h-11 text-sm text-slate-500 underline"
              onClick={() => setShowIt(true)}
            >
              Traduci in italiano
            </button>
          ))}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Non hai capito? Di’ <span lang="en">«Could you repeat the question, please?»</span> e
          tocca Riascolta.
        </p>
        <details className="mt-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
            💡 Suggerimento
          </summary>
          <p className="text-sm">{question.tip}</p>
          {prepared && (
            <p lang="en" className="mt-2 rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800">
              {prepared}
            </p>
          )}
        </details>
      </Card>

      {!result && (
        <Card>
          {rec.recording ? (
            <>
              <p className="text-center font-mono text-3xl" aria-live="off">
                {formatDuration(rec.elapsedMs)}
              </p>
              <p className="mt-1 text-center text-sm text-slate-500">
                Obiettivo: {question.targetSeconds[0]}–{question.targetSeconds[1]} secondi
              </p>
              {rec.text && (
                <p
                  lang="en"
                  className="mt-3 rounded-lg bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {rec.text}
                </p>
              )}
              {rec.sttError && (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  {sttErrorMessage(rec.sttError)} Continua pure a parlare:{' '}
                  {rec.audioError ? 'il tempo viene misurato.' : 'la tua voce viene registrata.'}
                </p>
              )}
              <Button
                className="mt-4 flex w-full items-center justify-center gap-2"
                onClick={() => void finish()}
              >
                <Icon name="stop" className="size-5" /> Ho finito
              </Button>
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-300">
                Quando sei pronto, tocca e rispondi ad alta voce, in inglese. Con calma: le pause
                vanno benissimo.
              </p>
              <Button
                className="mt-4 flex w-full items-center justify-center gap-2"
                onClick={() => void rec.start()}
              >
                <Icon name="mic" className="size-6" /> Rispondi
              </Button>
            </>
          )}
        </Card>
      )}

      {result && (
        <Card>
          <h3 className="text-lg font-bold">La tua risposta</h3>
          <p className="mt-1 text-sm">
            ⏱️ {formatDuration(result.durationMs)} · {durationComment(result.durationMs, question)}
            {wpm !== null && <> · {wpm} parole al minuto</>}
          </p>
          {result.recording && (
            <div className="mt-3">
              <AudioPlayer blob={result.recording.blob} label="Riascolta la tua risposta" />
            </div>
          )}
          {result.transcript ? (
            <>
              <p
                lang="en"
                className="mt-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-800"
                data-testid="transcript"
              >
                {result.transcript}
              </p>
              {!result.recording && (
                <div className="mt-2">
                  <SpeakButton text={result.transcript} />
                </div>
              )}
              <p className="mt-3 text-sm">
                {hits.length > 0 ? (
                  <>
                    ✅ Parole chiave usate: <strong lang="en">{hits.join(', ')}</strong>
                  </>
                ) : (
                  'Nessuna parola chiave riconosciuta, ma conta soprattutto rispondere: bravo che ci hai provato!'
                )}
              </p>
              {missing.length > 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Potevi citare anche: <span lang="en">{missing.join(', ')}</span>
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Nessuna trascrizione questa volta{result.recording ? ', ma puoi riascoltarti.' : '.'}{' '}
              Parole utili per questa domanda: <span lang="en">{question.keywords.join(', ')}</span>
            </p>
          )}

          <fieldset className="mt-4">
            <legend className="font-semibold">Come è andata?</legend>
            {checklist.map((c) => (
              <label key={c.id} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="size-5 accent-teal-700"
                  checked={checked.includes(c.id)}
                  onChange={(e) =>
                    setChecked((list) =>
                      e.target.checked ? [...list, c.id] : list.filter((x) => x !== c.id),
                    )
                  }
                />
                {c.label}
              </label>
            ))}
          </fieldset>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setResult(null)}>
              Riprova
            </Button>
            <Button onClick={() => onNext({ ...result, checklist: checked, keywordsHit: hits })}>
              {index + 1 < total ? 'Prossima' : 'Fine'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
