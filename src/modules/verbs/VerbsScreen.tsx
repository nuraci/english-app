import { Link } from 'react-router-dom'
import { useSpeaker } from '../../core/speech'
import { BackLink } from '../../ui/BackLink'
import { Icon } from '../../ui/Icon'
import { Card, Screen } from '../../ui/Screen'
import { formsSpeech, levelOf, verbGroups, verbs, type Verb } from './data'
import { computeProgress, UNLOCK_RATIO, type VerbStatus } from './progress'
import { useDueVerbCount, useVerbItems } from './useVerbItems'

const LEVEL_NAMES: Record<number, string> = {
  1: 'I 50 più usati',
  2: 'Uso quotidiano',
  3: 'Lavoro e tecnica',
}

const STATUS_STYLES: Record<VerbStatus, { dot: string; label: string }> = {
  new: { dot: 'bg-slate-300 dark:bg-slate-600', label: 'da scoprire' },
  learning: { dot: 'bg-amber-400', label: 'in corso' },
  learned: { dot: 'bg-emerald-500', label: 'imparato' },
}

export function VerbsScreen() {
  const items = useVerbItems()
  const progress = computeProgress(verbs, verbGroups, items ?? [])
  const due = useDueVerbCount()
  const group = progress.currentGroup

  return (
    <Screen title="Verbi irregolari">
      <BackLink to="/allenamenti" label="Allenamenti" />

      <Card>
        {group ? (
          <>
            <p className="text-sm font-semibold tracking-wide text-teal-700 uppercase dark:text-teal-300">
              Gruppo in corso
            </p>
            <p className="mt-1 text-xl font-bold">{group.name}</p>
            <p lang="en" className="mt-2 font-mono text-lg">
              {group.pattern}
            </p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{group.description}</p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Prossimi verbi:{' '}
              <span lang="en">
                {progress.nextNewVerbs
                  .slice(0, 5)
                  .map((v) => v.base)
                  .join(', ')}
              </span>
            </p>
          </>
        ) : (
          <p className="text-lg font-semibold">
            Hai visto tutti i verbi sbloccati: ora si ripassa! 🎉
          </p>
        )}
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Da ripassare adesso: <strong>{due ?? '…'}</strong>
        </p>
        <Link
          to="/allenamenti/verbi/sessione"
          className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950"
        >
          Inizia la sessione · 10 min
        </Link>
      </Card>

      {progress.levels.map((level) => (
        <Card key={level.level}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">
              {level.unlocked ? '' : '🔒 '}Livello {level.level}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {LEVEL_NAMES[level.level]}
            </span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-label={`Verbi imparati nel livello ${level.level}`}
            aria-valuenow={level.learned}
            aria-valuemin={0}
            aria-valuemax={level.total}
          >
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${(level.learned / level.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {level.learned} imparati · {level.seen} visti su {level.total}
          </p>
          {!level.unlocked && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Si sblocca quando avrai visto tutti i verbi del livello {level.level - 1} e ne avrai
              imparati almeno {Math.ceil(level.total * UNLOCK_RATIO)}.
            </p>
          )}
          <details className="mt-3">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-teal-700 dark:text-teal-300">
              Vedi i verbi
            </summary>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {verbs
                .filter((v) => levelOf(v) === level.level)
                .map((v) => (
                  <VerbRow key={v.base} verb={v} status={progress.statuses.get(v.base) ?? 'new'} />
                ))}
            </ul>
          </details>
        </Card>
      ))}
    </Screen>
  )
}

function VerbRow({ verb, status }: { verb: Verb; status: VerbStatus }) {
  const { speak } = useSpeaker()
  const style = STATUS_STYLES[status]
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={`size-3 shrink-0 rounded-full ${style.dot}`}
        title={style.label}
        aria-label={style.label}
      />
      <div className="min-w-0 flex-1">
        <p lang="en" className="font-medium">
          {verb.base} · {verb.past.join('/')} · {verb.participle.join('/')}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{verb.it}</p>
      </div>
      <button
        type="button"
        onClick={() => void speak(formsSpeech(verb))}
        aria-label={`Ascolta ${verb.base}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950"
      >
        <Icon name="speaker" className="size-5" />
      </button>
    </li>
  )
}
