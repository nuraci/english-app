import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../../core/db/db'
import { createRng } from '../../core/random'
import type { Exercise } from '../../core/session'
import { BackLink } from '../../ui/BackLink'
import { Screen } from '../../ui/Screen'
import { SessionRunner } from '../../ui/session/SessionRunner'
import { decks, MODULE, trapList } from './data'
import { buildTrapSession, buildVocabSession } from './session'

export function VocabSessionScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const traps = params.get('traps') === '1'
  const deck = decks.find((d) => d.id === params.get('deck')) ?? decks[0]
  const [exercises, setExercises] = useState<Exercise[] | null>(null)

  useEffect(() => {
    let alive = true
    void db.items
      .where('module')
      .equals(MODULE)
      .toArray()
      .then((items) => {
        if (!alive || !deck) return
        const now = new Date()
        const rng = createRng(now.getTime())
        setExercises(
          traps
            ? buildTrapSession({ items, now, rng })
            : buildVocabSession({ deck, items, now, rng }),
        )
      })
    return () => {
      alive = false
    }
  }, [deck, traps])

  return (
    <Screen title={traps ? trapList.name : (deck?.name ?? 'Vocabolario')}>
      <BackLink to="/allenamenti/vocabolario" label="Vocabolario tecnico" />
      {exercises ? (
        <SessionRunner
          module={MODULE}
          exercises={exercises}
          onDone={() => navigate('/allenamenti/vocabolario')}
        />
      ) : (
        <p>Preparo la sessione…</p>
      )}
    </Screen>
  )
}
