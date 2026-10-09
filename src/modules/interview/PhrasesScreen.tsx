import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useSpeaker } from '../../core/speech'
import { BackLink } from '../../ui/BackLink'
import { Icon } from '../../ui/Icon'
import { Card, Screen } from '../../ui/Screen'
import { SessionRunner } from '../../ui/session/SessionRunner'
import { lifesavers, MODULE, questionsToAsk, type Phrase } from './data'
import { phraseExercise } from './exercises'

const linkClass =
  'flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950'

function PhraseList({ phrases }: { phrases: Phrase[] }) {
  const { speak } = useSpeaker()
  return (
    <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
      {phrases.map((p) => (
        <li key={p.en} className="flex items-start gap-3 py-2">
          <div className="flex-1">
            <p lang="en" className="font-medium">
              {p.en}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{p.it}</p>
            {p.when && <p className="text-sm text-slate-600 dark:text-slate-300">{p.when}</p>}
          </div>
          <button
            type="button"
            onClick={() => void speak(p.en)}
            aria-label={`Ascolta: ${p.en}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950"
          >
            <Icon name="speaker" className="size-5" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function PhrasesScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const practice = params.get('practice')
  const exercises = useMemo(
    () =>
      practice === 'ask'
        ? questionsToAsk.map((p, i) => phraseExercise(p, 'ask', i))
        : practice === 'lifesaver'
          ? lifesavers.map((p, i) => phraseExercise(p, 'lifesaver', i))
          : [],
    [practice],
  )

  if (practice) {
    return (
      <Screen title={practice === 'ask' ? 'Domande da fare' : 'Frasi salvavita'}>
        <BackLink to="/allenamenti/colloquio/frasi" label="Frasi" />
        <SessionRunner
          module={MODULE}
          exercises={exercises}
          onDone={() => navigate('/allenamenti/colloquio/frasi')}
        />
      </Screen>
    )
  }

  return (
    <Screen title="Frasi utili">
      <BackLink to="/allenamenti/colloquio" label="Colloquio" />
      <Card>
        <h2 className="text-lg font-bold">🛟 Frasi salvavita</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Per prendere tempo, chiedere di ripetere, spiegarti meglio. Usarle è segno di sicurezza,
          non di debolezza.
        </p>
        <Link to="?practice=lifesaver" className={`${linkClass} mt-3`}>
          Allenati: ascolta e ripeti
        </Link>
        <PhraseList phrases={lifesavers} />
      </Card>
      <Card>
        <h2 className="text-lg font-bold">❓ Domande da fare al selezionatore</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Alla fine del colloquio ti chiederanno «Do you have any questions for us?». Preparane due
          o tre.
        </p>
        <Link to="?practice=ask" className={`${linkClass} mt-3`}>
          Allenati: ascolta e ripeti
        </Link>
        <PhraseList phrases={questionsToAsk} />
      </Card>
    </Screen>
  )
}
