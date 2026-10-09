import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { SpeakButton } from '../../ui/exercise/SpeakButton'
import { Card, Screen } from '../../ui/Screen'
import { ShadowPlayer } from '../../ui/ShadowPlayer'
import { categoryNames, questionById, questions, type QuestionCategory } from './data'
import { saveMyAnswer, useMyAnswers } from './storage'

export function AnswersScreen() {
  const answers = useMyAnswers() ?? {}
  return (
    <Screen title="Le tue risposte">
      <BackLink to="/allenamenti/colloquio" label="Colloquio" />
      <p className="text-slate-600 dark:text-slate-300">
        Scrivi le tue risposte con calma: poi la voce te le legge e le usi per lo shadowing.
      </p>
      {(Object.keys(categoryNames) as QuestionCategory[]).map((cat) => (
        <Card key={cat}>
          <h2 className="text-lg font-bold">{categoryNames[cat]}</h2>
          <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
            {questions
              .filter((q) => q.category === cat)
              .map((q) => (
                <li key={q.id}>
                  <Link
                    to={`/allenamenti/colloquio/risposte/${q.id}`}
                    className="flex min-h-12 items-center justify-between gap-3 py-2"
                  >
                    <span lang="en">{q.text}</span>
                    <span aria-label={answers[q.id] ? 'preparata' : 'da preparare'}>
                      {answers[q.id] ? '✅' : '›'}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      ))}
    </Screen>
  )
}

export function AnswerEditorScreen() {
  const { id = '' } = useParams()
  const question = questionById(id)
  const answers = useMyAnswers()
  const [draft, setDraft] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  if (!question || !answers) return null
  const text = draft ?? answers[question.id] ?? ''

  return (
    <Screen title="La tua risposta">
      <BackLink to="/allenamenti/colloquio/risposte" label="Le tue risposte" />
      <Card>
        <p lang="en" className="text-xl font-semibold">
          {question.text}
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{question.it}</p>
        <div className="mt-3">
          <SpeakButton text={question.text} />
        </div>
        <p className="mt-3 text-sm">💡 {question.tip}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Parole utili: <span lang="en">{question.keywords.join(', ')}</span>
        </p>
      </Card>
      <Card>
        <label className="block font-semibold" htmlFor="answer">
          La tua risposta (in inglese)
        </label>
        <textarea
          id="answer"
          lang="en"
          rows={8}
          value={text}
          onChange={(e) => {
            setDraft(e.target.value)
            setSaved(false)
          }}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
        />
        {question.sample && !text && (
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => setDraft(question.sample ?? '')}
          >
            Parti dalla risposta modello
          </Button>
        )}
        <Button
          className="mt-2 w-full"
          disabled={!text.trim()}
          onClick={() => void saveMyAnswer(question.id, text.trim()).then(() => setSaved(true))}
        >
          {saved ? 'Salvata ✓' : 'Salva'}
        </Button>
      </Card>
      {text.trim() && (
        <Card>
          <h2 className="text-lg font-bold">Ascolta e ripeti</h2>
          <div className="mt-2">
            <SpeakButton text={text} />
          </div>
          <div className="mt-4">
            <ShadowPlayer text={text} />
          </div>
        </Card>
      )}
    </Screen>
  )
}
