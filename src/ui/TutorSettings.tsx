import { useState } from 'react'
import { updateSettings, useSettings } from '../core/db/settings'
import { fetchUsage, TutorError, tutorErrorMessage } from '../modules/tutor/client'
import { Button } from './Button'

const inputClass =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950'

/** Indirizzo del backend e codice di accesso del Tutor AI: restano solo su questo dispositivo. */
export function TutorSettings() {
  const settings = useSettings()
  const [status, setStatus] = useState<string | null>(null)

  const verify = async () => {
    setStatus('Verifico…')
    try {
      const { quota, model } = await fetchUsage()
      setStatus(
        `Collegato ✓ · modello ${model} · oggi ${quota.requests} richieste, restano ${quota.requestsLeft}`,
      )
    } catch (e) {
      setStatus(tutorErrorMessage(e instanceof TutorError ? e.code : 'server'))
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Il Tutor AI passa da un piccolo server tuo (Cloudflare Worker) che custodisce la chiave
        dell’API: qui inserisci solo il suo indirizzo e il codice di accesso che hai scelto.
      </p>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Indirizzo del tutor</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://techtalk-tutor.<tuo-account>.workers.dev"
          defaultValue={settings.tutorUrl}
          key={`url-${settings.tutorUrl}`}
          onBlur={(e) => void updateSettings({ tutorUrl: e.target.value.trim() })}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Codice di accesso</span>
        <input
          type="password"
          autoComplete="off"
          defaultValue={settings.tutorCode}
          key={`code-${settings.tutorCode}`}
          onBlur={(e) => void updateSettings({ tutorCode: e.target.value.trim() })}
          className={inputClass}
        />
      </label>
      <Button variant="secondary" className="w-full" onClick={() => void verify()}>
        Verifica la connessione
      </Button>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </div>
  )
}
