import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  backupFileName,
  BackupError,
  deleteAllData,
  exportData,
  importData,
  parseBackup,
} from '../core/backup'
import { Button } from './Button'

/** Esporta, importa e cancella i dati: restano tuoi, sul tuo telefono. */
export function DataSettings() {
  const [message, setMessage] = useState<string | null>(null)

  const download = async () => {
    const backup = await exportData(__APP_VERSION__)
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    a.click()
    URL.revokeObjectURL(url)
    setMessage(
      'Backup scaricato. Conservalo: con questo file puoi spostare i tuoi progressi su un altro telefono.',
    )
  }

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      if (!window.confirm('Sostituire tutti i dati di questo telefono con quelli del backup?'))
        return
      await importData(backup)
      setMessage('Backup importato. Ricarico l’app…')
      window.location.reload()
    } catch (error) {
      setMessage(
        error instanceof BackupError ? error.message : 'Non sono riuscito a leggere il file.',
      )
    }
  }

  const wipe = async () => {
    if (
      !window.confirm(
        'Cancellare tutti i tuoi dati da questo telefono? Progressi, registrazioni e risposte andranno persi.',
      )
    )
      return
    if (!window.confirm('Sei sicuro? L’operazione non si può annullare.')) return
    await deleteAllData()
    window.location.reload()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Tutto resta su questo telefono: progressi, risposte e registrazioni. Nessun account, nessun
        server.
      </p>
      <Button variant="secondary" className="w-full" onClick={() => void download()}>
        Esporta i miei dati
      </Button>
      <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-teal-50 px-4 font-semibold text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800">
        Importa un backup
        <input
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => void upload(e)}
        />
      </label>
      <Button
        variant="ghost"
        className="w-full text-rose-700 dark:text-rose-300"
        onClick={() => void wipe()}
      >
        Cancella tutti i miei dati
      </Button>
      <Link
        to="/privacy"
        className="flex min-h-11 items-center text-sm text-teal-700 underline dark:text-teal-300"
      >
        Informativa sulla privacy
      </Link>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  )
}
