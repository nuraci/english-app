import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createRng } from '../../core/random'
import type { Exercise } from '../../core/session'
import { BackLink } from '../../ui/BackLink'
import { Screen } from '../../ui/Screen'
import { SessionRunner } from '../../ui/session/SessionRunner'
import { errorNames, MODULE, numberLevels } from './data'
import { buildNumberSession, type Speed } from './session'
import { computeNumberStats, recurringErrors } from './stats'
import { numberSkills, recentNumberReviews } from './useNumberData'

export function NumbersSessionScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<Exercise[] | null>(null)

  const level = Number(params.get('level')) || undefined
  const focus = params.get('focus') ?? undefined
  const speed: Speed = params.get('speed') === 'ramp' ? 'ramp' : 'normal'

  useEffect(() => {
    let alive = true
    void Promise.all([recentNumberReviews(), numberSkills()]).then(([reviews, skills]) => {
      if (!alive) return
      const recurring = recurringErrors(computeNumberStats(reviews)).map((e) => e.tag)
      const now = new Date()
      setExercises(
        buildNumberSession({
          level,
          focus,
          recurring,
          skills,
          speed,
          now,
          rng: createRng(now.getTime()),
        }),
      )
    })
    return () => {
      alive = false
    }
  }, [level, focus, speed])

  const title = focus
    ? `Mirato: ${errorNames[focus] ?? focus}`
    : (numberLevels.find((l) => l.level === level)?.name ?? 'Numeri')

  return (
    <Screen title={title}>
      <BackLink to="/allenamenti/numeri" label="Numeri e misure" />
      {exercises ? (
        <SessionRunner
          module={MODULE}
          exercises={exercises}
          onDone={() => navigate('/allenamenti/numeri')}
        />
      ) : (
        <p>Preparo la sessione…</p>
      )}
    </Screen>
  )
}
