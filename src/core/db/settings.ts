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
}

export const DEFAULT_SETTINGS: Settings = {
  accent: 'en-US',
  rate: 0.9,
  voiceURI: null,
  sttFallback: 'type',
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
