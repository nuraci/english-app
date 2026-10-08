import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../core/db/db'
import { createRng } from '../../core/random'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Card, Screen } from '../../ui/Screen'
import { SessionRunner } from '../../ui/session/SessionRunner'
import { MODULE, verbGroups, verbs } from './data'
import { buildVerbSession, type VerbSessionPlan } from './session'

export function VerbSessionScreen() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState<VerbSessionPlan | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let alive = true
    void db.items
      .where('module')
      .equals(MODULE)
      .toArray()
      .then((items) => {
        if (!alive) return
        const now = new Date()
        setPlan(
          buildVerbSession({
            verbs,
            groups: verbGroups,
            items,
            now,
            rng: createRng(now.getTime()),
          }),
        )
      })
    return () => {
      alive = false
    }
  }, [])

  const back = () => navigate('/allenamenti/verbi')

  return (
    <Screen title="Sessione verbi">
      <BackLink to="/allenamenti/verbi" label="Verbi irregolari" />
      {!plan ? (
        <p>Preparo la sessione…</p>
      ) : plan.exercises.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold">Niente da ripassare adesso. Torna più tardi! ☕</p>
        </Card>
      ) : !started ? (
        <SessionIntro plan={plan} onStart={() => setStarted(true)} />
      ) : (
        <SessionRunner module={MODULE} exercises={plan.exercises} onDone={back} />
      )}
    </Screen>
  )
}

function SessionIntro({ plan, onStart }: { plan: VerbSessionPlan; onStart: () => void }) {
  return (
    <Card>
      <p className="text-lg">
        Oggi: <strong>{plan.exercises.length} esercizi</strong>
        {plan.reviewVerbs.length > 0 && <> · {plan.reviewVerbs.length} ripassi</>}
        {plan.newVerbs.length > 0 && <> · {plan.newVerbs.length} verbi nuovi</>}
      </p>
      {plan.group && plan.newVerbs.length > 0 && (
        <div className="mt-4 rounded-xl bg-teal-50 p-4 dark:bg-teal-950">
          <p className="font-bold">{plan.group.name}</p>
          <p lang="en" className="mt-1 font-mono">
            {plan.group.pattern}
          </p>
          <p className="mt-2 text-sm">{plan.group.description}</p>
          <p lang="en" className="mt-2 text-sm font-semibold">
            {plan.newVerbs.map((v) => v.base).join(' · ')}
          </p>
        </div>
      )}
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Tip: leggi ad alta voce ogni risposta, anche quando scrivi. 🗣️
      </p>
      <Button className="mt-4 w-full" onClick={onStart}>
        Iniziamo
      </Button>
    </Card>
  )
}
