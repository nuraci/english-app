import { useState } from 'react'
import { Link } from 'react-router-dom'
import { updateSettings, useSettings } from '../../core/db/settings'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Card, Screen } from '../../ui/Screen'
import { groupTips, letterGroups, personalFields } from './data'
import { savePersonalData, usePersonalData } from './personalData'
import { computeTrapStats } from './stats'
import { useSpellingReviews } from './useSpellingReviews'

const linkClass =
  'flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950'
const secondaryLinkClass =
  'flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800'

const TRAININGS = [
  {
    mode: 'alphabet',
    title: 'Alfabeto',
    text: '12 lettere, a partire dalle trappole per gli italiani: A/E/I, G/J, H, W, Y…',
  },
  {
    mode: 'dictation',
    title: 'Dettato di codici',
    text: '10 codici dettati lettera per lettera: part number, sigle, cognomi, email.',
  },
  {
    mode: 'aloud',
    title: 'Spelling a voce',
    text: 'L’app ti mostra un codice, tu fai lo spelling al microfono.',
  },
] as const

export function SpellingScreen() {
  const settings = useSettings()
  const reviews = useSpellingReviews()
  const traps = computeTrapStats(reviews ?? [])
  const groupName = (id: string) => letterGroups.find((g) => g.id === id)?.name ?? id

  return (
    <Screen title="Spelling">
      <BackLink to="/allenamenti" label="Allenamenti" />

      {traps.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold">Le lettere che confondi</h2>
          <ul className="mt-3 space-y-3">
            {traps.map((t) => (
              <li key={t.tag}>
                <p className="font-semibold">
                  {groupName(t.tag)}{' '}
                  <span className="font-normal text-slate-500">· {t.count} volte</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{groupTips[t.tag]}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {TRAININGS.map((t) => (
        <Card key={t.mode}>
          <h2 className="text-lg font-bold">{t.title}</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{t.text}</p>
          <Link
            to={`/allenamenti/spelling/sessione?mode=${t.mode}`}
            className={`${linkClass} mt-3`}
          >
            Inizia: {t.title}
          </Link>
          {t.mode === 'alphabet' && (
            <Link to="/allenamenti/spelling/alfabeto" className={`${secondaryLinkClass} mt-2`}>
              Tabella dell’alfabeto
            </Link>
          )}
        </Card>
      ))}

      <PersonalCard />

      <Card>
        <label className="flex min-h-12 items-center justify-between gap-3">
          <span>
            <span className="block font-semibold">Aiuto con l’alfabeto NATO</span>
            <span className="block text-sm text-slate-500 dark:text-slate-400">
              Alpha, Bravo, Charlie… nelle soluzioni
            </span>
          </span>
          <input
            type="checkbox"
            className="size-6 accent-teal-700"
            checked={settings.spellingNato}
            onChange={(e) => void updateSettings({ spellingNato: e.target.checked })}
          />
        </label>
      </Card>
    </Screen>
  )
}

function PersonalCard() {
  const saved = usePersonalData()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const values = { ...saved, ...draft }
  const hasData = personalFields.some((f) => saved?.[f.kind]?.trim())

  return (
    <Card>
      <h2 className="text-lg font-bold">I tuoi dati</h2>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        «Could you spell your surname, please?» Al colloquio o al telefono capita sempre. Scrivi i
        tuoi dati: restano solo su questo telefono.
      </p>
      <div className="mt-3 space-y-3">
        {personalFields.map((f) => (
          <label key={f.kind} className="block">
            <span className="mb-1 block text-sm font-semibold">{f.label}</span>
            <input
              type={f.kind === 'email' ? 'email' : 'text'}
              autoComplete={
                f.kind === 'email' ? 'email' : f.kind === 'name' ? 'given-name' : 'family-name'
              }
              value={values[f.kind] ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, [f.kind]: e.target.value }))}
              onBlur={(e) => void savePersonalData(f.kind, e.target.value.trim())}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
        ))}
      </div>
      {hasData ? (
        <Link to="/allenamenti/spelling/sessione?mode=personal" className={`${linkClass} mt-4`}>
          Inizia: i tuoi dati
        </Link>
      ) : (
        <Button className="mt-4 w-full" disabled>
          Compila almeno un campo
        </Button>
      )}
    </Card>
  )
}
