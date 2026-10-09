import { charName } from '../../content/generators/spelling'
import { useSettings } from '../../core/db/settings'
import { useSpeaker } from '../../core/speech'
import { BackLink } from '../../ui/BackLink'
import { Icon } from '../../ui/Icon'
import { Card, Screen } from '../../ui/Screen'
import { letterGroups, letters, TRAP_LETTERS } from './data'

export function AlphabetScreen() {
  const settings = useSettings()
  const { speak } = useSpeaker()
  return (
    <Screen title="Alfabeto">
      <BackLink to="/allenamenti/spelling" label="Spelling" />
      <Card>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {letters.map((l) => {
            const trap = TRAP_LETTERS.includes(l.letter)
            const name = charName(l.letter, settings.accent)
            return (
              <li key={l.letter} className="flex items-center gap-3 py-2">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-mono text-2xl font-bold ${
                    trap
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {l.letter}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {l.it}
                    {trap && <span className="sr-only"> (trappola)</span>}
                  </p>
                  <p lang="en" className="text-sm text-slate-500 dark:text-slate-400">
                    {name} · {l.nato}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void speak(name)}
                  aria-label={`Ascolta la lettera ${l.letter}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950"
                >
                  <Icon name="speaker" className="size-5" />
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Le trappole</h2>
        <ul className="mt-2 space-y-3">
          {letterGroups.map((g) => (
            <li key={g.id}>
              <p className="font-semibold">{g.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{g.tip}</p>
            </li>
          ))}
        </ul>
      </Card>
    </Screen>
  )
}
