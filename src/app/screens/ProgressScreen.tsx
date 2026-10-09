import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import { addDays, daysBetween, parseDayKey, weekStart } from '../../core/progress'
import { AudioPlayer } from '../../ui/AudioPlayer'
import { BarList } from '../../ui/charts/BarList'
import { ColumnChart } from '../../ui/charts/ColumnChart'
import { Card, Screen } from '../../ui/Screen'
import { itemLabel, MODULE_NAMES } from '../progress/labels'
import { useProgressData, type ProgressData } from '../today/useProgressData'

const short = (key: string) =>
  parseDayKey(key).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

export function ProgressScreen() {
  const data = useProgressData()
  if (!data) return <Screen title="Progressi">{null}</Screen>
  const { level, streak } = data

  return (
    <Screen title="Progressi">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Punti esperienza</p>
          <p className="text-3xl font-bold" data-testid="xp-total">
            {data.totalXp.toLocaleString('it-IT')}
          </p>
          <p className="text-sm">Livello {level.level}</p>
          <div
            className="mt-2 h-2 rounded-full bg-teal-100 dark:bg-teal-950"
            role="progressbar"
            aria-label="Verso il prossimo livello"
            aria-valuenow={level.intoLevel}
            aria-valuemin={0}
            aria-valuemax={level.perLevel}
          >
            <div
              className="h-2 rounded-full bg-[#0d9488]"
              style={{ width: `${(level.intoLevel / level.perLevel) * 100}%` }}
            />
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Serie</p>
          <p className="text-3xl font-bold">🔥 {streak.current}</p>
          <p className="text-sm">
            Record: {streak.best} · giorni attivi: {data.active.size}
          </p>
        </Card>
      </div>

      <Calendar data={data} />
      <XpChart data={data} />
      <Modules data={data} />
      <HardItems data={data} />
      <VoiceComparison />
      <Badges data={data} />
    </Screen>
  )
}

function Calendar({ data }: { data: ProgressData }) {
  const start = addDays(weekStart(data.today), -28)
  const days = daysBetween(start, addDays(weekStart(data.today), 6))
  return (
    <Card>
      <h2 className="text-lg font-bold">Ultime 5 settimane</h2>
      <div
        className="mt-3 grid grid-cols-7 gap-1"
        role="list"
        aria-label="Calendario degli allenamenti"
      >
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-center text-xs text-slate-500">
            {d}
          </span>
        ))}
        {days.map((d) => {
          const active = data.active.has(d)
          const jolly = data.streak.jollyDays.includes(d)
          const future = d > data.today
          return (
            <span
              key={d}
              role="listitem"
              aria-label={`${short(d)}: ${active ? 'allenamento' : jolly ? 'jolly' : future ? '' : 'riposo'}`}
              data-day={d}
              data-state={active ? 'active' : jolly ? 'jolly' : 'none'}
              className={`flex aspect-square items-center justify-center rounded-md text-xs ${
                active
                  ? 'bg-[#0d9488] text-white'
                  : future
                    ? 'bg-transparent'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              } ${d === data.today ? 'ring-2 ring-slate-400' : ''}`}
            >
              {jolly ? '🃏' : parseDayKey(d).getDate()}
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        🃏 = giorno coperto da un jolly: la serie non si è interrotta.
      </p>
    </Card>
  )
}

function XpChart({ data }: { data: ProgressData }) {
  const days = daysBetween(addDays(data.today, -27), data.today)
  const columns = days.map((d) => ({
    key: d,
    label: short(d),
    value: data.xp.get(d) ?? 0,
    tooltip: `${short(d)}: ${data.xp.get(d) ?? 0} XP`,
  }))
  return (
    <Card>
      <h2 className="text-lg font-bold">XP al giorno · ultimi 28 giorni</h2>
      <div className="mt-2">
        <ColumnChart
          data={columns}
          caption="Punti esperienza guadagnati ogni giorno negli ultimi 28 giorni"
          unit="XP"
        />
      </div>
    </Card>
  )
}

function Modules({ data }: { data: ProgressData }) {
  const since = parseDayKey(addDays(data.today, -30)).getTime()
  const recent = data.reviews.filter((r) => r.reviewedAt >= since)
  const items = Object.keys(MODULE_NAMES)
    .map((m) => {
      const mine = recent.filter((r) => r.module === m)
      const correct = mine.filter((r) => r.correct).length
      return {
        key: m,
        label: MODULE_NAMES[m] as string,
        value: mine.length,
        detail: mine.length
          ? `${mine.length} risposte · ${Math.round((correct / mine.length) * 100)}% giuste`
          : 'ancora niente',
      }
    })
    .filter((i) => i.key !== 'shadowing' && i.key !== 'interview')
  return (
    <Card>
      <h2 className="text-lg font-bold">Per modulo · ultimi 30 giorni</h2>
      <div className="mt-3">
        <BarList items={items} caption="Risposte per modulo negli ultimi 30 giorni" />
      </div>
    </Card>
  )
}

function HardItems({ data }: { data: ProgressData }) {
  const hard = data.items
    .filter((i) => i.card.lapses > 0 || (i.card.reps > 1 && i.card.stability < 1))
    .sort((a, b) => b.card.lapses - a.card.lapses || a.card.stability - b.card.stability)
    .slice(0, 10)
  return (
    <Card>
      <h2 className="text-lg font-bold">Le parole più difficili</h2>
      {hard.length === 0 ? (
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Per ora nessuna: quando qualcosa ti farà inciampare più volte, lo vedrai qui.
        </p>
      ) : (
        <ul
          className="mt-2 divide-y divide-slate-200 dark:divide-slate-800"
          data-testid="hard-items"
        >
          {hard.map((i) => (
            <li key={i.id} className="flex min-h-11 items-center justify-between gap-2 py-1">
              <span lang="en" className="font-medium">
                {itemLabel(i.id)}
              </span>
              <span className="text-sm text-slate-500">
                {MODULE_NAMES[i.module]} · {i.card.lapses}{' '}
                {i.card.lapses === 1 ? 'errore' : 'errori'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/** "Come parlavi un mese fa": la prima e l'ultima registrazione della stessa domanda. */
function VoiceComparison() {
  const pair = useLiveQuery(async () => {
    const attempts = (await db.attempts.orderBy('createdAt').toArray()).filter(
      (a) => a.recordingId !== undefined,
    )
    const byQuestion = new Map<string, typeof attempts>()
    for (const a of attempts)
      byQuestion.set(a.questionId, [...(byQuestion.get(a.questionId) ?? []), a])
    let best: [(typeof attempts)[number], (typeof attempts)[number]] | null = null
    for (const list of byQuestion.values()) {
      const first = list[0]
      const last = list.at(-1)
      if (!first || !last || first === last) continue
      if (!best || last.createdAt - first.createdAt > best[1].createdAt - best[0].createdAt)
        best = [first, last]
    }
    if (!best) return null
    const [a, b] = await Promise.all([
      db.recordings.get(best[0].recordingId ?? -1),
      db.recordings.get(best[1].recordingId ?? -1),
    ])
    return a && b ? { first: best[0], last: best[1], a, b } : null
  }, [])

  return (
    <Card>
      <h2 className="text-lg font-bold">Come parlavi prima</h2>
      {!pair ? (
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Rispondi più volte alla stessa domanda nella prova di colloquio: qui potrai confrontare la
          prima registrazione con l’ultima e sentire quanto sei migliorato.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
          <p lang="en" className="font-semibold">
            {pair.first.question}
          </p>
          <div>
            <p className="text-sm text-slate-500">
              {new Date(pair.first.createdAt).toLocaleDateString('it-IT')} · prima volta
            </p>
            <AudioPlayer blob={pair.a.blob} label="Prima registrazione" />
          </div>
          <div>
            <p className="text-sm text-slate-500">
              {new Date(pair.last.createdAt).toLocaleDateString('it-IT')} · ultima volta
            </p>
            <AudioPlayer blob={pair.b.blob} label="Ultima registrazione" />
          </div>
        </div>
      )}
    </Card>
  )
}

function Badges({ data }: { data: ProgressData }) {
  return (
    <Card>
      <h2 className="text-lg font-bold">Badge</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2" data-testid="badges">
        {data.badges.map((b) => (
          <li
            key={b.id}
            data-earned={b.earned}
            className={`rounded-xl p-3 ${b.earned ? 'bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-950 dark:ring-teal-800' : 'bg-slate-100 opacity-60 dark:bg-slate-800'}`}
          >
            <p className="text-2xl" aria-hidden="true">
              {b.earned ? b.emoji : '🔒'}
            </p>
            <p className="font-semibold">{b.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{b.description}</p>
            <span className="sr-only">{b.earned ? 'ottenuto' : 'da ottenere'}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
