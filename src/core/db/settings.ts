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
  /** Piano (freemium predisposto): durante la beta è tutto incluso. */
  plan: 'free' | 'beta' | 'premium'
  /** Pacchetti di contenuti attivi, oltre al base. */
  activePacks: string[]
  /** Onboarding con test di livello completato. */
  onboardingDone: boolean
  /** Lingua dell'interfaccia. */
  uiLanguage: string
}

export const DEFAULT_SETTINGS: Settings = {
  accent: 'en-US',
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
  plan: 'beta',
  activePacks: ['semiconductors'],
  onboardingDone: false,
  uiLanguage: 'it',
}

export async function getSettings(database = db): Promise<Settings> {
  const rows = await database.settings.toArray()
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<Settings>
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function updateSettings(patch: Partial<Settings>, database = db): Promise<void> {
  await database.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}

/** Impostazioni sempre aggiornate; fino al primo caricamento valgono quelle di default. */
export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS)
}
