import { useEffect, useState } from 'react'
import { db } from '../../core/db/db'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Card, Screen } from '../../ui/Screen'
import { ShadowPlayer } from '../../ui/ShadowPlayer'
import { TELL_ME_ID, tellMeSteps } from './data'
import { saveMyAnswer } from './storage'

const STEP_KIND = 'tellme-step'

async function loadSteps(): Promise<Record<string, string>> {
  const rows = await db.userTexts.where('kind').equals(STEP_KIND).toArray()
  return Object.fromEntries(rows.map((r) => [r.title, r.text]))
}

async function saveStep(id: string, text: string) {
  const now = Date.now()
  const existing = await db.userTexts
    .where('kind')
    .equals(STEP_KIND)
    .filter((r) => r.title === id)
    .first()
  if (existing?.id !== undefined) await db.userTexts.update(existing.id, { text, updatedAt: now })
  else await db.userTexts.add({ kind: STEP_KIND, title: id, text, createdAt: now, updatedAt: now })
}

/** Costruttore guidato: chi sei · esperienza · punti di forza · perché questo ruolo. */
export function TellMeScreen() {
  const [steps, setSteps] = useState<Record<string, string> | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void loadSteps().then(setSteps)
  }, [])

  if (!steps) return null
  const full = tellMeSteps
    .map((s) => steps[s.id]?.trim())
    .filter(Boolean)
    .join(' ')

  const update = (id: string, text: string) => {
    setSaved(false)
    setSteps((s) => ({ ...s, [id]: text }))
  }

  return (
    <Screen title="Tell me about yourself">
      <BackLink to="/allenamenti/colloquio" label="Colloquio" />
      <p className="text-slate-600 dark:text-slate-300">
        È quasi sempre la prima domanda. Costruiscila in 4 passi, con frasi semplici: tocca un
        inizio di frase per usarlo, poi completalo.
      </p>
      {tellMeSteps.map((step, i) => (
        <Card key={step.id}>
          <h2 className="text-lg font-bold">
            {i + 1}. {step.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.help}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {step.starters.map((starter) => (
              <button
                key={starter}
                type="button"
                lang="en"
                className="min-h-11 rounded-full bg-teal-50 px-3 text-left text-sm text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800"
                onClick={() =>
                  update(step.id, `${steps[step.id] ? `${steps[step.id]} ` : ''}${starter}`)
                }
              >
                + {starter}
              </button>
            ))}
          </div>
          <textarea
            lang="en"
            aria-label={step.title}
            rows={3}
            value={steps[step.id] ?? ''}
            onChange={(e) => update(step.id, e.target.value)}
            onBlur={(e) => void saveStep(step.id, e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
          />
        </Card>
      ))}
      {full && (
        <Card>
          <h2 className="text-lg font-bold">La tua presentazione</h2>
          <div className="mt-3">
            <ShadowPlayer text={full} />
          </div>
          <Button
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => void saveMyAnswer(TELL_ME_ID, full).then(() => setSaved(true))}
          >
            {saved ? 'Salvata tra le tue risposte ✓' : 'Salva tra le tue risposte'}
          </Button>
        </Card>
      )}
    </Screen>
  )
}
