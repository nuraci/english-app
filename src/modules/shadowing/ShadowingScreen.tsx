import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../../ui/BackLink'
import { Button } from '../../ui/Button'
import { Card, Screen } from '../../ui/Screen'
import { builtInSources, type ShadowSource } from './sources'
import { deleteSubtitles, saveSubtitles, useUserSources } from './storage'
import { parseSubtitles, shadowingLines } from './subtitles'

const primary =
  'flex min-h-12 flex-1 items-center justify-center rounded-xl px-3 font-semibold bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950'
const secondary =
  'flex min-h-12 flex-1 items-center justify-center rounded-xl px-3 font-semibold bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800'

function SourceCard({ source, onDelete }: { source: ShadowSource; onDelete?: () => void }) {
  return (
    <Card>
      <h2 className="text-lg font-bold">{source.name}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {source.description} · {source.items.length} frasi
      </p>
      <div className="mt-3 flex gap-2">
        <Link
          to={`/allenamenti/shadowing/player?source=${source.id}`}
          className={primary}
          aria-label={`Frase per frase: ${source.name}`}
        >
          Frase per frase
        </Link>
        <Link
          to={`/allenamenti/shadowing/auto?source=${source.id}`}
          className={secondary}
          aria-label={`Modalità auto: ${source.name}`}
        >
          🚗 Auto
        </Link>
      </div>
      {onDelete && (
        <Button variant="ghost" className="mt-2 w-full text-sm" onClick={onDelete}>
          Elimina
        </Button>
      )}
    </Card>
  )
}

function ImportCard() {
  const [message, setMessage] = useState<string | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const lines = shadowingLines(parseSubtitles(await file.text()))
    if (lines.length === 0) {
      setMessage('In questo file non ho trovato battute: è un file .srt o .vtt?')
      return
    }
    const name = file.name.replace(/\.(srt|vtt)$/i, '')
    await saveSubtitles(name, lines)
    setMessage(`Fatto! «${name}»: ${lines.length} battute pronte per lo shadowing.`)
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">🎬 Importa sottotitoli</h2>
      <p className="mt-1 text-slate-600 dark:text-slate-300">
        Scegli un file .srt (o .vtt) di un episodio, per esempio di The IT Crowd: le battute
        diventano frasi da imitare. Il file resta sul telefono.
      </p>
      <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white dark:bg-teal-500 dark:text-slate-950">
        Scegli il file
        <input
          type="file"
          accept=".srt,.vtt,text/vtt,application/x-subrip"
          className="sr-only"
          onChange={(e) => void onFile(e)}
        />
      </label>
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </Card>
  )
}

export function ShadowingScreen() {
  const [builtIn] = useState(() => builtInSources())
  const user = useUserSources() ?? []
  return (
    <Screen title="Shadowing e ascolto">
      <BackLink to="/allenamenti" label="Allenamenti" />
      <p className="text-slate-600 dark:text-slate-300">
        Shadowing: ascolti una frase e la ripeti subito, copiando ritmo e intonazione. Sblocca la
        bocca più di qualsiasi esercizio scritto.
      </p>
      <ImportCard />
      {user.map((s) => (
        <SourceCard
          key={s.id}
          source={s}
          onDelete={
            s.id.startsWith('srt-')
              ? () => {
                  if (window.confirm(`Eliminare «${s.name}»?`))
                    void deleteSubtitles(Number(s.id.slice(4)))
                }
              : undefined
          }
        />
      ))}
      {builtIn.map((s) => (
        <SourceCard key={s.id} source={s} />
      ))}
    </Screen>
  )
}
