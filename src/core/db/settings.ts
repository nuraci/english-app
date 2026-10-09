import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export type Accent = 'en-US' | 'en-GB'
export type SttFallback = 'type' | 'selfgrade'

export type Settings = {
  accent: Accent
  /** Velocità della voce, da 0.6 a 1.2. */
  rate: number
  /** voiceURI della voce scelta; se manca si usa la migliore per l'accento. */
  voiceURI: string | null
  /** Cosa fare negli esercizi parlati se il riconoscimento vocale non c'è. */
  sttFallback: SttFallback
  /** Numeri: velocità normale o crescente durante la sessione. */
  numbersSpeed: 'normal' | 'ramp'
  /** Spelling: mostra l'alfabeto NATO come aiuto. */
  spellingNato: boolean
  /** Obiettivo settimanale: giorni di allenamento (3–7). */
  weeklyGoalDays: number
  reminderEnabled: boolean
  /** Ora del promemoria (0–23). */
  reminderHour: number
  /** Indirizzo del backend del Tutor AI (Cloudflare Worker). */
  tutorUrl: string
  /** Codice di accesso al tutor: lo inserisce l'utente, non è nel codice dell'app. */
  tutorCode: string
  /** Identificativo anonimo del dispositivo, per i limiti di utilizzo. */
  deviceId: string
  /** Pacchetti di contenuti attivi, oltre al base. */
  activePacks: string[]
  /** Onboarding con test di livello completato. */
  onboardingDone: boolean
  /** Sincronizzazione con Google Drive attivata su questo dispositivo. */
  driveConnected: boolean
  /** Ultima sincronizzazione riuscita (ms). */
  lastSyncAt: number
}

export const DEFAULT_SETTINGS: Settings = {
  accent: 'en-GB',
  rate: 0.9,
  voiceURI: null,
  sttFallback: 'type',
  numbersSpeed: 'normal',
  spellingNato: false,
  weeklyGoalDays: 5,
  reminderEnabled: false,
  reminderHour: 19,
  tutorUrl: '',
  tutorCode: '',
  deviceId: '',
  activePacks: ['semiconductors'],
  onboardingDone: false,
  driveConnected: false,
  lastSyncAt: 0,
}

export async function getSettings(database = db): Promise<Settings> {
  const rows = await database.settings.toArray()
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Settings>
  return { ...DEFAULT_SETTINGS, ...stored }
}

/** Impostazioni legate al singolo dispositivo: non si sincronizzano tra telefono e PC. */
export const DEVICE_SETTINGS: readonly string[] = [
  'voiceURI',
  'deviceId',
  'reminderEnabled',
  'reminderHour',
  'driveConnected',
  'lastSyncAt',
]

/** Quando sono cambiate l'ultima volta le impostazioni condivise (per la sincronizzazione). */
export const SETTINGS_UPDATED_AT = 'settingsUpdatedAt'

export async function updateSettings(patch: Partial<Settings>, database = db): Promise<void> {
  const rows: { key: string; value: unknown }[] = Object.entries(patch).map(([key, value]) => ({
    key,
    value,
  }))
  if (rows.some((r) => !DEVICE_SETTINGS.includes(r.key)))
    rows.push({ key: SETTINGS_UPDATED_AT, value: Date.now() })
  await database.settings.bulkPut(rows)
}

/** Impostazioni sempre aggiornate; fino al primo caricamento valgono quelle di default. */
export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS)
}
