import { db, type AppDatabase } from './db/db'

/** Formato del file di backup: tutte le tabelle, audio compreso (in base64). */
export const BACKUP_FORMAT = 'techtalk-coach-backup'
export const BACKUP_VERSION = 1

const TABLES = [
  'items',
  'reviews',
  'sessions',
  'settings',
  'userTexts',
  'attempts',
  'recordings',
] as const
type TableName = (typeof TABLES)[number]

export type Backup = {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  appVersion: string
  tables: Record<TableName, unknown[]>
}

/** Legge i byte di un Blob; FileReader dove `arrayBuffer` non c'è (browser vecchi, jsdom). */
export function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await readBlob(blob))
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** Le date (Date) diventano stringhe ISO con un marcatore, per ritrovarle all'importazione. */
export function encodeDates(value: unknown): unknown {
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Array.isArray(value)) return value.map(encodeDates)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeDates(v)]))
  }
  return value
}

export function decodeDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeDates)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.$date === 'string' && Object.keys(obj).length === 1) return new Date(obj.$date)
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, decodeDates(v)]))
  }
  return value
}

/** Tutti i dati dell'utente in un oggetto JSON (il diritto di accesso del GDPR, in pratica). */
export async function exportData(appVersion: string, database: AppDatabase = db): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>
  for (const name of TABLES) {
    const rows = await database.table(name).toArray()
    tables[name] =
      name === 'recordings'
        ? await Promise.all(
            rows.map(async (r: { blob: Blob }) => ({
              ...r,
              blob: { $blob: await blobToBase64(r.blob), type: r.blob.type },
            })),
          )
        : rows.map(encodeDates)
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    tables,
  }
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('Il file non è un backup valido.')
  }
  const backup = data as Partial<Backup>
  if (backup?.format !== BACKUP_FORMAT || typeof backup.version !== 'number' || !backup.tables) {
    throw new BackupError('Il file non è un backup di TechTalk Coach.')
  }
  if (backup.version > BACKUP_VERSION)
    throw new BackupError('Il backup viene da una versione più recente dell’app: aggiornala.')
  return backup as Backup
}

/** Sostituisce tutti i dati del dispositivo con quelli del backup. */
export async function importData(backup: Backup, database: AppDatabase = db): Promise<void> {
  await database.transaction(
    'rw',
    TABLES.map((n) => database.table(n)),
    async () => {
      for (const name of TABLES) {
        const table = database.table(name)
        await table.clear()
        const rows = backup.tables[name] ?? []
        const decoded =
          name === 'recordings'
            ? rows.map((r) => {
                const rec = r as { blob: { $blob: string; type: string } }
                return { ...rec, blob: base64ToBlob(rec.blob.$blob, rec.blob.type) }
              })
            : rows.map(decodeDates)
        if (decoded.length) await table.bulkAdd(decoded)
      }
    },
  )
}

/** Cancella tutti i dati dell'utente da questo dispositivo. */
export async function deleteAllData(database: AppDatabase = db): Promise<void> {
  await database.transaction(
    'rw',
    TABLES.map((n) => database.table(n)),
    async () => {
      for (const name of TABLES) await database.table(name).clear()
    },
  )
}

export function backupFileName(date = new Date()): string {
  return `techtalk-coach-${date.toISOString().slice(0, 10)}.json`
}
