import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import { personalFields } from './data'

const KINDS = personalFields.map((f) => f.kind)

/** Nome, cognome ed email dell'utente: restano solo sul dispositivo (tabella userTexts). */
export async function getPersonalData(): Promise<Record<string, string>> {
  const rows = await db.userTexts.where('kind').anyOf(KINDS).toArray()
  return Object.fromEntries(rows.map((r) => [r.kind, r.text]))
}

export async function savePersonalData(kind: string, text: string): Promise<void> {
  const now = Date.now()
  const label = personalFields.find((f) => f.kind === kind)?.label ?? kind
  await db.transaction('rw', db.userTexts, async () => {
    const existing = await db.userTexts.where('kind').equals(kind).first()
    if (existing?.id !== undefined) await db.userTexts.update(existing.id, { text, updatedAt: now })
    else await db.userTexts.add({ kind, title: label, text, createdAt: now, updatedAt: now })
  })
}

export function usePersonalData(): Record<string, string> | undefined {
  return useLiveQuery(getPersonalData, [])
}
