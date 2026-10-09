import { Link } from 'react-router-dom'
import { BackLink } from '../../ui/BackLink'
import { Card, Screen } from '../../ui/Screen'
import { useInterviewHistory, useMyAnswers } from './storage'

const linkClass =
  'flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950'
const rowClass =
  'flex min-h-16 items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

export function InterviewScreen() {
  const history = useInterviewHistory()
  const answers = useMyAnswers()
  const rows = [
    {
      to: 'tell-me',
      emoji: '🙋',
      title: 'Tell me about yourself',
      text: 'Costruisci la tua presentazione, passo per passo',
    },
    {
      to: 'risposte',
      emoji: '✍️',
      title: 'Le tue risposte',
      text: `${Object.keys(answers ?? {}).length} preparate · ascoltale e fai shadowing`,
    },
    {
      to: 'frasi',
      emoji: '🛟',
      title: 'Frasi salvavita e domande da fare',
      text: '«Could you repeat the question, please?»',
    },
    {
      to: 'storico',
      emoji: '🎧',
      title: 'Le tue prove',
      text: `${history?.length ?? 0} prove salvate · riascoltale`,
    },
  ]
  return (
    <Screen title="Colloquio">
      <BackLink to="/allenamenti" label="Allenamenti" />
      <Card>
        <h2 className="text-lg font-bold">Prova di colloquio</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          10 domande lette dalla voce: HR, tecniche e comportamentali. Rispondi a voce, poi rivedi
          la trascrizione, la durata e le parole chiave. Circa 20 minuti.
        </p>
        <Link to="/allenamenti/colloquio/prova" className={`${linkClass} mt-3`}>
          Inizia la prova
        </Link>
      </Card>
      {rows.map((r) => (
        <Link key={r.to} to={`/allenamenti/colloquio/${r.to}`} className={rowClass}>
          <span className="text-3xl" aria-hidden="true">
            {r.emoji}
          </span>
          <span className="flex-1">
            <span className="block font-bold">{r.title}</span>
            <span className="block text-sm text-slate-500 dark:text-slate-400">{r.text}</span>
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      ))}
    </Screen>
  )
}
