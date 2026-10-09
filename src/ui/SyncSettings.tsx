import { useState } from 'react'
import { updateSettings, useSettings } from '../core/db/settings'
import {
  deleteDriveData,
  forgetToken,
  googleClientId,
  SyncError,
  syncErrorMessage,
  syncNow,
} from '../core/sync/drive'
import { Button } from './Button'

function formatSyncTime(at: number): string {
  if (!at) return 'mai'
  return new Date(at).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Sincronizzazione con Google Drive: per usare l'app da telefono e PC con gli stessi progressi. */
export function SyncSettings() {
  const settings = useSettings()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    setMessage('Sincronizzo…')
    try {
      await action()
      setMessage(done)
    } catch (e) {
      setMessage(syncErrorMessage(e instanceof SyncError ? e.code : 'drive'))
    } finally {
      setBusy(false)
    }
  }

  if (!googleClientId) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Non ancora configurata: serve l’ID client Google dell’app (vedi il README, sezione
        «Sincronizzazione con Google Drive»).
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Progressi, ripassi, risposte e impostazioni in una cartella nascosta del tuo Google Drive,
        che solo questa app può vedere. Così ritrovi tutto su telefono e PC. Le registrazioni audio
        restano su ogni dispositivo.
      </p>
      {settings.driveConnected ? (
        <>
          <p className="text-sm" data-testid="last-sync">
            Ultima sincronizzazione: <strong>{formatSyncTime(settings.lastSyncAt)}</strong>
          </p>
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => void run(() => syncNow(), 'Sincronizzato ✓')}
          >
            Sincronizza ora
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => {
              forgetToken()
              void updateSettings({ driveConnected: false })
              setMessage(
                'Google Drive scollegato. I dati restano su questo dispositivo e su Drive.',
              )
            }}
          >
            Scollega Google Drive
          </Button>
          <Button
            variant="ghost"
            className="w-full text-rose-700 dark:text-rose-300"
            disabled={busy}
            onClick={() => {
              if (
                !window.confirm(
                  'Eliminare la copia dei dati su Google Drive? I dati su questo dispositivo restano.',
                )
              )
                return
              void run(async () => {
                await deleteDriveData()
                forgetToken()
                await updateSettings({ driveConnected: false, lastSyncAt: 0 })
              }, 'Copia su Google Drive eliminata.')
            }}
          >
            Elimina i dati da Google Drive
          </Button>
        </>
      ) : (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void run(() => syncNow(true), 'Collegato e sincronizzato ✓')}
        >
          Collega Google Drive
        </Button>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  )
}
