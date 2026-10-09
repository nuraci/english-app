import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import { AudioPlayer } from '../../ui/AudioPlayer'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { SpeakButton } from '../../ui/exercise/SpeakButton'
import { Card, Screen } from '../../ui/Screen'
import { formatDuration } from './analysis'
import { deleteInterviewSession, useInterviewHistory } from './storage'

function Recording({ id }: { id: number }) {
  const rec = useLiveQuery(() => db.recordings.get(id), [id])
  return rec ? <AudioPlayer blob={rec.blob} label="Riascolta la risposta" /> : null
}

export function HistoryScreen() {
  const history = useInterviewHistory()
  return (
    <Screen title="Le tue prove">
      <BackLink to="/allenamenti/colloquio" label="Colloquio" />
      {history?.length === 0 && (
        <Card>
          <p>Ancora nessuna prova. La prima è sempre la più difficile: coraggio! 💪</p>
        </Card>
      )}
      {history?.map(({ session, attempts }) => (
        <Card key={session.id}>
          <h2 className="font-bold">
            {new Date(session.startedAt).toLocaleString('it-IT', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{attempts.length} risposte</p>
          <details className="mt-2">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-teal-700 dark:text-teal-300">
              Vedi e riascolta
            </summary>
            <ol className="space-y-4">
              {attempts.map((a) => (
                <li key={a.id} className="border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p lang="en" className="font-semibold">
                    {a.question}
                  </p>
                  <p className="text-sm text-slate-500">⏱️ {formatDuration(a.durationMs)}</p>
                  {a.recordingId !== undefined && (
                    <div className="mt-2">
                      <Recording id={a.recordingId} />
                    </div>
                  )}
                  {a.transcript ? (
                    <>
                      <p
                        lang="en"
                        className="mt-2 rounded-lg bg-slate-100 p-2 text-sm dark:bg-slate-800"
                      >
                        {a.transcript}
                      </p>
                      {a.recordingId === undefined && (
                        <div className="mt-2">
                          <SpeakButton text={a.transcript} />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">Nessuna trascrizione.</p>
                  )}
                </li>
              ))}
            </ol>
          </details>
          <Button
            variant="ghost"
            className="mt-2 w-full text-sm"
            onClick={() => {
              if (window.confirm('Eliminare questa prova e le sue registrazioni?'))
                void deleteInterviewSession(session.id)
            }}
          >
            Elimina questa prova
          </Button>
        </Card>
      ))}
    </Screen>
  )
}
