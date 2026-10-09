import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../core/db/settings'
import { BackLink } from '../../ui/BackLink'
import { Card, Screen } from '../../ui/Screen'
import { fetchUsage, type Quota } from './client'
import { modes, topics } from './data'
import { useTutorHistory } from './storage'

const primary =
  'flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950'

export function UsageLine({ quota }: { quota: Quota | null }) {
  if (!quota) return null
  return (
    <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="tutor-usage">
      Oggi: {quota.requests} richieste · {quota.tokens.toLocaleString('it-IT')} token · ≈ $
      {quota.costUsd.toFixed(2)} · ne restano {quota.requestsLeft}
    </p>
  )
}

export function TutorScreen() {
  const settings = useSettings()
  const history = useTutorHistory()
  const configured = Boolean(settings.tutorUrl && settings.tutorCode)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [topic, setTopic] = useState(topics[0]?.id ?? 'work')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!configured) return
    fetchUsage()
      .then((u) => setQuota(u.quota))
      .catch(() => setQuota(null))
  }, [configured])

  const topicText = custom.trim() || topics.find((t) => t.id === topic)?.topic || ''

  return (
    <Screen title="Tutor AI">
      <BackLink to="/allenamenti" label="Allenamenti" />
      {!configured ? (
        <Card>
          <p className="font-semibold">Il tutor va collegato una volta sola.</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Inserisci l’indirizzo del tuo server e il codice di accesso nelle Impostazioni. Serve la
            rete: il resto dell’app funziona anche offline.
          </p>
          <Link to="/impostazioni" className={`${primary} mt-3`}>
            Vai alle Impostazioni
          </Link>
        </Card>
      ) : (
        <Card>
          <UsageLine quota={quota} />
          {!quota && (
            <p className="text-sm text-slate-500">
              Consumo di oggi non disponibile (sei offline?).
            </p>
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-bold">🎤 {modes.interview.title}</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{modes.interview.description}</p>
        <Link
          to="/allenamenti/tutor/chat?mode=interview"
          className={`${primary} mt-3 ${configured ? '' : 'pointer-events-none opacity-50'}`}
          aria-disabled={!configured}
        >
          Inizia il colloquio
        </Link>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">💬 {modes.conversation.title}</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{modes.conversation.description}</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Argomento">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={topic === t.id && !custom}
              onClick={() => {
                setTopic(t.id)
                setCustom('')
              }}
              className={`min-h-11 rounded-full px-3 text-sm ${topic === t.id && !custom ? 'bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          lang="en"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="…oppure scrivi un argomento (in inglese o italiano)"
          aria-label="Argomento personalizzato"
          className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
        />
        <Link
          to={`/allenamenti/tutor/chat?mode=conversation&topic=${encodeURIComponent(topicText)}`}
          className={`${primary} mt-3 ${configured ? '' : 'pointer-events-none opacity-50'}`}
          aria-disabled={!configured}
        >
          Inizia la conversazione
        </Link>
      </Card>

      {history && history.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold">Le tue sessioni</h2>
          <ul className="mt-2 space-y-3" data-testid="tutor-history">
            {history.map((h) => (
              <li key={h.id} className="border-t border-slate-200 pt-2 dark:border-slate-800">
                <p className="font-semibold">
                  {h.mode === 'interview' ? 'Colloquio' : 'Conversazione'} ·{' '}
                  {new Date(h.endedAt).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  · {Math.round((h.endedAt - h.startedAt) / 60000)} min
                </p>
                {h.summary && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{h.summary}</p>
                )}
                <details className="mt-1">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm text-teal-700 dark:text-teal-300">
                    {h.corrections.length} correzioni
                  </summary>
                  <ul className="space-y-2 text-sm">
                    {h.corrections.map((c, i) => (
                      <li key={i}>
                        <span lang="en" className="line-through opacity-70">
                          {c.you_said}
                        </span>{' '}
                        → <strong lang="en">{c.better}</strong>
                        <br />
                        {c.explanation_it}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Screen>
  )
}
