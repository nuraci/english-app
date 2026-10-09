import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../core/db/db'
import { useSpeaker } from '../../core/speech'
import { BackLink } from '../../ui/BackLink'
import { Icon } from '../../ui/Icon'
import { Card, Screen } from '../../ui/Screen'
import { usePacks } from '../../core/usePacks'
import { decksFor, MODULE, speechOf, trapList, type Term } from './data'
import { deckStatus } from './session'

const linkClass =
  'flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950'

export function VocabScreen() {
  const items = useLiveQuery(() => db.items.where('module').equals(MODULE).toArray(), []) ?? []
  const decks = decksFor(usePacks())

  return (
    <Screen title="Vocabolario tecnico">
      <BackLink to="/allenamenti" label="Allenamenti" />

      <Card>
        <h2 className="text-lg font-bold">🗣️ {trapList.name}</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{trapList.description}</p>
        <p lang="en" className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {trapList.words
            .slice(0, 8)
            .map((w) => w.en)
            .join(' · ')}
          …
        </p>
        <Link to="/allenamenti/vocabolario/sessione?traps=1" className={`${linkClass} mt-3`}>
          Allenati sulle trappole
        </Link>
        <TermList terms={trapList.words.map((w) => ({ ...w, trap: true }))} />
      </Card>

      {decks.map((deck) => {
        const status = deckStatus(deck, items)
        return (
          <Card key={deck.id}>
            <h2 className="text-lg font-bold">{deck.name}</h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{deck.description}</p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              role="progressbar"
              aria-label={`Termini imparati: ${deck.name}`}
              aria-valuenow={status.learned}
              aria-valuemin={0}
              aria-valuemax={status.total}
            >
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${(status.learned / status.total) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {status.learned} imparati · {status.seen} visti su {status.total}
            </p>
            <Link
              to={`/allenamenti/vocabolario/sessione?deck=${deck.id}`}
              className={`${linkClass} mt-3`}
              aria-label={`Allenati: ${deck.name}`}
            >
              Allenati
            </Link>
            <TermList terms={deck.terms} />
          </Card>
        )
      })}
    </Screen>
  )
}

type TermRow = Pick<Term, 'id' | 'en' | 'it' | 'note' | 'say' | 'trap'>

function TermList({ terms }: { terms: TermRow[] }) {
  const { speak } = useSpeaker()
  return (
    <details className="mt-2">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-teal-700 dark:text-teal-300">
        Vedi i termini ({terms.length})
      </summary>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {terms.map((t) => (
          <li key={t.id} className="flex items-start gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p lang="en" className="font-medium">
                {t.en}
                {t.trap && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                    pronuncia
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.it}</p>
              {t.note && <p className="text-sm text-slate-600 dark:text-slate-300">{t.note}</p>}
            </div>
            <button
              type="button"
              onClick={() => void speak(speechOf(t))}
              aria-label={`Ascolta ${t.en}`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950"
            >
              <Icon name="speaker" className="size-5" />
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
