import { db as defaultDb, type AppDatabase } from '../db/db'
import { getSettings, updateSettings } from '../db/settings'
import {
  applySyncData,
  exportSyncData,
  mergeSyncData,
  parseSyncData,
  serializeSyncData,
} from './merge'

/**
 * Sincronizzazione con Google Drive, senza server: login Google nel browser (Google Identity Services)
 * e un solo file nella cartella nascosta dell'app (appDataFolder). Permesso richiesto: solo drive.appdata,
 * che non dà accesso agli altri file di Drive.
 */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
export const SYNC_FILE_NAME = 'techtalk-coach-sync.json'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

/** ID client OAuth (pubblico, non è un segreto): arriva dalla build. */
export const googleClientId: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export type SyncErrorCode = 'not-configured' | 'offline' | 'auth' | 'cancelled' | 'drive'

export class SyncError extends Error {
  constructor(public readonly code: SyncErrorCode) {
    super(code)
  }
}

export function syncErrorMessage(code: SyncErrorCode): string {
  switch (code) {
    case 'not-configured':
      return 'La sincronizzazione non è ancora configurata (manca l’ID client Google).'
    case 'offline':
      return 'Per sincronizzare serve la rete.'
    case 'auth':
      return 'Google non ha concesso l’accesso. Riprova a collegare Google Drive.'
    case 'cancelled':
      return 'Accesso annullato.'
    case 'drive':
      return 'Google Drive non ha risposto come previsto. Riprova tra poco.'
  }
}

type TokenResponse = { access_token?: string; expires_in?: number; error?: string }
type TokenClient = { requestAccessToken: (config?: { prompt?: string }) => void }
type Gis = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (r: TokenResponse) => void
        error_callback?: (e: { type: string }) => void
      }) => TokenClient
      revoke: (token: string, done?: () => void) => void
    }
  }
}

const gis = () => (window as unknown as { google?: Gis }).google

let gisLoading: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (gis()?.accounts?.oauth2) return Promise.resolve()
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisLoading = null
      reject(new SyncError('offline'))
    }
    document.head.appendChild(script)
  })
  return gisLoading
}

let token: { value: string; expiresAt: number } | null = null

/** Token valido in memoria (dura circa un'ora): permette di sincronizzare senza chiedere di nuovo. */
export function hasValidToken(now = Date.now()): boolean {
  return token !== null && token.expiresAt - 60_000 > now
}

/**
 * Chiede un token a Google. Va chiamata da un tocco dell'utente (apre la finestra di Google):
 * la prima volta per il consenso, poi senza domande finché il consenso resta valido.
 */
export async function requestToken(firstTime = false): Promise<string> {
  if (!googleClientId) throw new SyncError('not-configured')
  if (!navigator.onLine) throw new SyncError('offline')
  if (hasValidToken() && token) return token.value
  await loadGis()
  const oauth = gis()?.accounts.oauth2
  if (!oauth) throw new SyncError('auth')
  return new Promise((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: googleClientId,
      scope: DRIVE_SCOPE,
      callback: (r) => {
        if (!r.access_token) return reject(new SyncError('auth'))
        token = { value: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 }
        resolve(r.access_token)
      },
      error_callback: (e) =>
        reject(new SyncError(e.type === 'popup_closed' ? 'cancelled' : 'auth')),
    })
    client.requestAccessToken({ prompt: firstTime ? 'consent' : '' })
  })
}

export function forgetToken(): void {
  if (token) gis()?.accounts.oauth2.revoke(token.value)
  token = null
}

/** Chiamate a Drive con il token; `fetch` si può sostituire nei test. */
export class DriveClient {
  constructor(
    private readonly accessToken: string,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  private async call(url: string, init: RequestInit = {}): Promise<Response> {
    const res = await this.fetchFn(url, {
      ...init,
      headers: { Authorization: `Bearer ${this.accessToken}`, ...(init.headers ?? {}) },
    })
    if (res.status === 401 || res.status === 403) {
      token = null
      throw new SyncError('auth')
    }
    if (!res.ok) throw new SyncError('drive')
    return res
  }

  async findFile(): Promise<string | null> {
    const q = encodeURIComponent(`name='${SYNC_FILE_NAME}'`)
    const res = await this.call(`${API}?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=10`)
    const data = (await res.json()) as { files?: { id: string }[] }
    return data.files?.[0]?.id ?? null
  }

  async download(id: string): Promise<string> {
    return (await this.call(`${API}/${id}?alt=media`)).text()
  }

  async create(content: string): Promise<string> {
    const boundary = `techtalk${Math.random().toString(16).slice(2)}`
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify({ name: SYNC_FILE_NAME, parents: ['appDataFolder'] }),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n')
    const res = await this.call(`${UPLOAD}?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    })
    return ((await res.json()) as { id: string }).id
  }

  async update(id: string, content: string): Promise<void> {
    await this.call(`${UPLOAD}/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    })
  }

  async remove(id: string): Promise<void> {
    await this.call(`${API}/${id}`, { method: 'DELETE' })
  }
}

export type SyncReport = { at: number; created: boolean }

/** Scarica da Drive, unisce con i dati del dispositivo, applica e ricarica su Drive. */
export async function syncWithDrive(
  client: DriveClient,
  database: AppDatabase = defaultDb,
  now = Date.now(),
): Promise<SyncReport> {
  const id = await client.findFile()
  const remote = id ? parseSyncData(await client.download(id)) : null
  const merged = mergeSyncData(await exportSyncData(database), remote)
  if (remote) await applySyncData(merged, database)
  const content = serializeSyncData(merged)
  if (id) await client.update(id, content)
  else await client.create(content)
  if (database === defaultDb) await updateSettings({ lastSyncAt: now, driveConnected: true })
  return { at: now, created: !id }
}

/** Sincronizza con un tocco: chiede il token se serve (finestra di Google) e poi sincronizza. */
export async function syncNow(firstTime = false): Promise<SyncReport> {
  const accessToken = await requestToken(firstTime)
  return syncWithDrive(new DriveClient(accessToken))
}

/** Dopo una sessione: sincronizza in silenzio solo se c'è già un token valido (nessuna finestra). */
export async function syncQuietly(): Promise<void> {
  const settings = await getSettings()
  if (!settings.driveConnected || !hasValidToken() || !navigator.onLine || !token) return
  try {
    await syncWithDrive(new DriveClient(token.value))
  } catch {
    // Riproverà alla prossima occasione.
  }
}

/** Elimina il file di sincronizzazione da Drive. */
export async function deleteDriveData(): Promise<void> {
  const client = new DriveClient(await requestToken())
  const id = await client.findFile()
  if (id) await client.remove(id)
}
