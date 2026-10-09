import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../../core/db/db'
import { getSettings } from '../../core/db/settings'
import { createRng } from '../../core/random'
import type { Exercise } from '../../core/session'
import { BackLink } from '../../ui/BackLink'
import { Card, Screen } from '../../ui/Screen'
import { SessionRunner } from '../../ui/session/SessionRunner'
import { MODULE } from './data'
import { getPersonalData } from './personalData'
import {
  buildAloudSession,
  buildAlphabetSession,
  buildDictationSession,
  buildPersonalSession,
} from './session'

const TITLES: Record<string, string> = {
  alphabet: 'Alfabeto',
  dictation: 'Dettato di codici',
  aloud: 'Spelling a voce',
  personal: 'I tuoi dati',
}

export function SpellingSessionScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mode = params.get('mode') ?? 'dictation'
  const [exercises, setExercises] = useState<Exercise[] | null>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([
      db.items.where('module').equals(MODULE).toArray(),
      getSettings(),
      getPersonalData(),
    ]).then(([items, settings, personal]) => {
      if (!alive) return
      const now = new Date()
      const options = { accent: settings.accent, nato: settings.spellingNato }
      const ctx = { items, now, rng: createRng(now.getTime()), options }
      setExercises(
        mode === 'alphabet'
          ? buildAlphabetSession(ctx)
          : mode === 'aloud'
            ? buildAloudSession(ctx)
            : mode === 'personal'
              ? buildPersonalSession(personal, options)
              : buildDictationSession(ctx),
      )
    })
    return () => {
      alive = false
    }
  }, [mode])

  return (
    <Screen title={TITLES[mode] ?? 'Spelling'}>
      <BackLink to="/allenamenti/spelling" label="Spelling" />
      {!exercises ? (
        <p>Preparo la sessione…</p>
      ) : exercises.length === 0 ? (
        <Card>
          <p>Compila prima i tuoi dati nella pagina Spelling.</p>
        </Card>
      ) : (
        <SessionRunner
          module={MODULE}
          exercises={exercises}
          onDone={() => navigate('/allenamenti/spelling')}
        />
      )}
    </Screen>
  )
}
