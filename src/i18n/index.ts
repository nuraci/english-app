import { useSettings } from '../core/db/settings'
import it from './it.json'

/**
 * Traduzioni dell'interfaccia. I contenuti da imparare restano in inglese; qui c'è solo la UI.
 * Per aggiungere una lingua: copia it.json in <codice>.json, traducilo e aggiungilo a DICTIONARIES.
 * Le chiavi mancanti ricadono sull'italiano.
 */
export type MessageKey = keyof typeof it
type Dictionary = Partial<Record<MessageKey, string>>

export const DICTIONARIES: Record<string, { name: string; messages: Dictionary }> = {
  it: { name: 'Italiano', messages: it },
}

export const DEFAULT_LANGUAGE = 'it'

export function translate(
  language: string,
  key: MessageKey,
  vars: Record<string, string | number> = {},
): string {
  const text = DICTIONARIES[language]?.messages[key] ?? it[key] ?? key
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
}

/** Funzione di traduzione nella lingua scelta nelle impostazioni. */
export function useT() {
  const { uiLanguage } = useSettings()
  return (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(uiLanguage, key, vars)
}
