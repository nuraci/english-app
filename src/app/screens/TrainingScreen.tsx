import { Link } from 'react-router-dom'
import { Card, Screen } from '../../ui/Screen'

const MODULES = [
  {
    to: '/allenamenti/verbi',
    title: 'Verbi irregolari',
    subtitle: 'write → wrote → written',
    emoji: '🔁',
  },
  {
    to: '/allenamenti/numeri',
    title: 'Numeri e misure',
    subtitle: '13 or 30? · 47 kΩ · 0x4000',
    emoji: '🔢',
  },
  {
    to: '/allenamenti/spelling',
    title: 'Spelling',
    subtitle: 'aitch, double you, zed · STM32H743',
    emoji: '🔤',
  },
]

const COMING = ['Vocabolario tecnico', 'Simulazione di colloquio']

export function TrainingScreen() {
  return (
    <Screen title="Allenamenti">
      {MODULES.map((m) => (
        <Link
          key={m.to}
          to={m.to}
          className="flex min-h-16 items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        >
          <span className="text-3xl" aria-hidden="true">
            {m.emoji}
          </span>
          <span className="flex-1">
            <span className="block text-lg font-bold">{m.title}</span>
            <span lang="en" className="block text-sm text-slate-500 dark:text-slate-400">
              {m.subtitle}
            </span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      ))}
      <Card>
        <p className="font-semibold">In arrivo</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{COMING.join(' · ')}</p>
      </Card>
    </Screen>
  )
}
