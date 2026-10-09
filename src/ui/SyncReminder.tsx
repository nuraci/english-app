import { useEffect, useState } from 'react'
import { useSettings } from '../core/db/settings'
import { SyncError, syncErrorMessage, syncNow } from '../core/sync/drive'
import { Button } from './Button'
import { Card } from './Screen'

/** Ogni quanto proporre la sincronizzazione: più di 6 ore fa. */
const STALE_MS = 6 * 60 * 60 * 1000

/** In Oggi: se Drive è collegato e l'ultima sincronizzazione è vecchia, la propone con un tocco. */
export function SyncReminder() {
  const settings = useSettings()
  const [stale, setStale] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setStale(Date.now() - settings.lastSyncAt > STALE_MS)
    const t = setTimeout(check, 0)
    return () => clearTimeout(t)
  }, [settings.lastSyncAt])

  if (!settings.driveConnected || !stale)
    return status ? (
      <p role="status" className="text-sm">
        {status}
      </p>
    ) : null
  return (
    <Card>
      <p className="font-semibold">☁️ Sincronizza con Google Drive</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Così ritrovi i progressi anche sugli altri dispositivi.
      </p>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() => {
          setStatus('Sincronizzo…')
          syncNow()
            .then(() => setStatus('Sincronizzato ✓'))
            .catch((e: unknown) =>
              setStatus(syncErrorMessage(e instanceof SyncError ? e.code : 'drive')),
            )
        }}
      >
        Sincronizza ora
      </Button>
    </Card>
  )
}
