import { Link } from 'react-router-dom'
import { generateNumberItem } from '../../content/generators/numbers'
import { updateSettings, useSettings } from '../../core/db/settings'
import { createRng } from '../../core/random'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Card, Screen } from '../../ui/Screen'
import { errorNames, errorTips, numberLevels } from './data'
import { computeNumberStats, recommendedLevel, recurringErrors } from './stats'
import { useNumberReviews } from './useNumberData'

const linkClass =
  'flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950'

/** Un esempio fisso per ogni livello, per far capire cosa contiene. */
function sampleOf(level: number, kinds: string[]): string {
  const rng = createRng(level * 31)
  return kinds
    .slice(0, 3)
    .map((k) => generateNumberItem(level, k, rng).display)
    .join(' · ')
}

export function NumbersScreen() {
  const reviews = useNumberReviews()
  const settings = useSettings()
  const stats = computeNumberStats(reviews ?? [])
  const recurring = recurringErrors(stats)
  const recommended = recommendedLevel(stats)
  const speedParam = `speed=${settings.numbersSpeed}`

  return (
    <Screen title="Numeri e misure">
      <BackLink to="/allenamenti" label="Allenamenti" />

      {recurring.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold">I tuoi errori ricorrenti</h2>
          <ul className="mt-3 space-y-4">
            {recurring.map((e) => (
              <li key={e.tag}>
                <p className="font-semibold">
                  {errorNames[e.tag] ?? e.tag}{' '}
                  <span className="font-normal text-slate-500">· {e.count} volte</span>
                </p>
                {e.examples.length > 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Es.:{' '}
                    {e.examples
                      .map((x) => `hai scritto «${x.answer}», era «${x.expected}»`)
                      .join('; ')}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {errorTips[e.tag]}
                </p>
                <Link
                  to={`/allenamenti/numeri/sessione?focus=${e.tag}&${speedParam}`}
                  className={`${linkClass} mt-2`}
                >
                  Allenamento mirato
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <p className="mb-2 font-semibold">Velocità della voce</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['normal', 'Normale'],
              ['ramp', 'Crescente 🚀'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={settings.numbersSpeed === value ? 'primary' : 'secondary'}
              aria-pressed={settings.numbersSpeed === value}
              onClick={() => void updateSettings({ numbersSpeed: value })}
            >
              {label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Con «Crescente» la voce accelera durante la sessione, fino a una velocità da riunione
          vera.
        </p>
      </Card>

      {numberLevels.map((level) => {
        const s = stats.levels.find((l) => l.level === level.level)
        return (
          <Card key={level.level}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">
                {level.level}. {level.name}
              </h2>
              {level.level === recommended && (
                <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-900 dark:text-teal-100">
                  Consigliato
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{level.description}</p>
            <p lang="en" className="mt-2 font-mono text-sm text-slate-500 dark:text-slate-400">
              {sampleOf(level.level, level.kinds)}
            </p>
            {s?.accuracy != null && (
              <p className="mt-2 text-sm">
                Risposte giuste: <strong>{Math.round(s.accuracy * 100)}%</strong> su {s.answered}
              </p>
            )}
            <Link
              to={`/allenamenti/numeri/sessione?level=${level.level}&${speedParam}`}
              className={`${linkClass} mt-3`}
              aria-label={`Allenati: livello ${level.level}, ${level.name}`}
            >
              Allenati
            </Link>
          </Card>
        )
      })}
    </Screen>
  )
}
