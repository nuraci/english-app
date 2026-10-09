import { Link } from 'react-router-dom'
import { parseDayKey } from '../../core/progress'
import { Card, Screen } from '../../ui/Screen'
import { useProgressData } from '../today/useProgressData'

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

export function TodayScreen() {
  const data = useProgressData()
  if (!data) return <Screen title="Oggi">{null}</Screen>
  const { streak, week, plan, level } = data
  const todayXp = data.xp.get(data.today) ?? 0
  const longDate = parseDayKey(data.today).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  // "venerdì 9 ottobre" → "Venerdì 9 ottobre": in italiano il mese resta minuscolo.
  const date = longDate.charAt(0).toUpperCase() + longDate.slice(1)

  return (
    <Screen title="Oggi">
      <p className="-mt-4 text-slate-500 dark:text-slate-400">{date}</p>

      <div className="grid grid-cols-3 gap-2" data-testid="today-stats">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Serie</p>
          <p className="text-2xl font-bold" data-testid="streak">
            🔥 {streak.current}
          </p>
          <p className="text-xs text-slate-500">record {streak.best}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">XP oggi</p>
          <p className="text-2xl font-bold" data-testid="xp-today">
            {todayXp}
          </p>
          <p className="text-xs text-slate-500">livello {level.level}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Jolly</p>
          <p className="text-2xl font-bold" data-testid="jollies">
            🃏 {streak.jolliesLeft}
          </p>
          <p className="text-xs text-slate-500">per i giorni no</p>
        </Card>
      </div>

      <Card>
        <p className="font-semibold">
          {streak.todayDone
            ? 'Grande! Oggi la serie è salva. 🔥'
            : streak.current > 0
              ? `Bastano 10 minuti per portare la serie a ${streak.current + 1} giorni.`
              : 'Iniziamo? Bastano 10 minuti per partire.'}
        </p>
        {streak.jollyDays.length > 0 && !streak.todayDone && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Se oggi non ce la fai, nessun problema: un jolly copre il giorno e la serie resta.
          </p>
        )}
        <div className="mt-3">
          <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="week-goal">
            Obiettivo settimanale: {week.done}/{week.goal} giorni
          </p>
          <ol className="mt-2 grid grid-cols-7 gap-1" aria-label="Giorni di questa settimana">
            {week.days.map((d, i) => {
              const active = data.active.has(d)
              const jolly = streak.jollyDays.includes(d)
              return (
                <li
                  key={d}
                  aria-label={`${WEEKDAYS[i]}: ${active ? 'allenamento fatto' : jolly ? 'jolly' : d > data.today ? 'da fare' : 'riposo'}`}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm font-semibold ${
                    active
                      ? 'bg-[#0d9488] text-white'
                      : d === data.today
                        ? 'ring-2 ring-[#0d9488]'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}
                >
                  {jolly ? '🃏' : WEEKDAYS[i]}
                </li>
              )
            })}
          </ol>
        </div>
      </Card>

      <h2 className="pt-2 text-xl font-bold">La sessione di oggi · 30 minuti</h2>
      {plan.map((block, i) => (
        <Card key={block.id}>
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
            {i + 1}. {block.title} · {block.minutes} min {block.done && '· ✅ fatto'}
          </p>
          <p className="mt-1 text-lg font-bold">{block.activity}</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{block.reason}</p>
          <Link
            to={block.to}
            className={`mt-3 flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold ${
              block.done
                ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800'
                : 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950'
            }`}
          >
            {block.done ? 'Rifallo' : 'Inizia'}
          </Link>
        </Card>
      ))}

      <Card>
        <h2 className="text-lg font-bold">Sessione lunga (facoltativa)</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Una o due volte a settimana: un episodio di una serie in shadowing e una prova di
          colloquio completa.
        </p>
        <div className="mt-3 grid gap-2">
          <Link
            to={
              data.subtitles
                ? `/allenamenti/shadowing/player?source=${data.subtitles.id}`
                : '/allenamenti/shadowing'
            }
            className="flex min-h-12 items-center justify-center rounded-xl bg-teal-50 px-4 font-semibold text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800"
          >
            🎬 {data.subtitles ? `Episodio: ${data.subtitles.name}` : 'Importa un episodio'}
          </Link>
          <Link
            to="/allenamenti/colloquio/prova"
            className="flex min-h-12 items-center justify-center rounded-xl bg-teal-50 px-4 font-semibold text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800"
          >
            🎤 Prova di colloquio (10 domande)
          </Link>
        </div>
      </Card>
    </Screen>
  )
}
