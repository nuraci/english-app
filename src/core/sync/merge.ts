import { decodeDates, encodeDates } from '../backup'
import {
  db as defaultDb,
  type AppDatabase,
  type AttemptRecord,
  type ItemRecord,
  type ReviewRecord,
  type SessionRecord,
  type UserTextRecord,
} from '../db/db'
import { DEVICE_SETTINGS, SETTINGS_UPDATED_AT } from '../db/settings'

/**
 * Dati da sincronizzare tra dispositivi (Google Drive). Le registrazioni audio restano su ogni dispositivo.
 * Gli id automatici di IndexedDB sono diversi su ogni dispositivo: qui si usano chiavi naturali.
 */
export const SYNC_FORMAT = 'techtalk-coach-sync'
export const SYNC_VERSION = 1

type NoId<T> = Omit<T, 'id'>
export type SyncAttempt = Omit<NoId<AttemptRecord>, 'sessionId' | 'recordingId'> & {
  sessionKey: string
}

export type SyncData = {
  format: typeof SYNC_FORMAT
  version: number
  settingsUpdatedAt: number
  settings: Record<string, unknown>
  items: ItemRecord[]
  reviews: NoId<ReviewRecord>[]
  sessions: NoId<SessionRecord>[]
  userTexts: NoId<UserTextRecord>[]
  attempts: SyncAttempt[]
}

/** Testi che si aggiungono (uno per sessione) invece di essere modificati. */
const APPEND_KINDS = new Set(['tutor-summary', 'level-test'])

const sessionKey = (s: Pick<SessionRecord, 'module' | 'startedAt'>) => `${s.module}|${s.startedAt}`
const reviewKey = (r: Pick<ReviewRecord, 'itemId' | 'reviewedAt' | 'rating'>) =>
  `${r.itemId}|${r.reviewedAt}|${r.rating}`
const textKey = (t: Pick<UserTextRecord, 'kind' | 'title' | 'createdAt'>) =>
  APPEND_KINDS.has(t.kind) ? `${t.kind}|${t.title}|${t.createdAt}` : `${t.kind}|${t.title}`
const attemptKey = (a: Pick<AttemptRecord, 'questionId' | 'createdAt'>) =>
  `${a.questionId}|${a.createdAt}`

function strip<T extends { id?: unknown }>(row: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = row
  return rest
}

export async function exportSyncData(database: AppDatabase = defaultDb): Promise<SyncData> {
  const [items, reviews, sessions, userTexts, attempts, settingRows] = await Promise.all([
    database.items.toArray(),
    database.reviews.toArray(),
    database.sessions.toArray(),
    database.userTexts.toArray(),
    database.attempts.toArray(),
    database.settings.toArray(),
  ])
  const sessionById = new Map(sessions.map((s) => [s.id, s]))
  const settings = Object.fromEntries(
    settingRows
      .filter((r) => !DEVICE_SETTINGS.includes(r.key) && r.key !== SETTINGS_UPDATED_AT)
      .map((r) => [r.key, r.value]),
  )
  const updatedAt = settingRows.find((r) => r.key === SETTINGS_UPDATED_AT)?.value
  return {
    format: SYNC_FORMAT,
    version: SYNC_VERSION,
    settingsUpdatedAt: typeof updatedAt === 'number' ? updatedAt : 0,
    settings,
    items,
    reviews: reviews.map(strip),
    sessions: sessions.map(strip),
    userTexts: userTexts.map(strip),
    attempts: attempts.map((a) => {
      const { id: _id, sessionId, recordingId: _rec, ...rest } = a
      const session = sessionById.get(sessionId)
      return { ...rest, sessionKey: session ? sessionKey(session) : '' }
    }),
  }
}

function unionBy<T>(
  a: readonly T[],
  b: readonly T[],
  key: (x: T) => string,
  pick: (x: T, y: T) => T,
): T[] {
  const map = new Map<string, T>()
  for (const x of [...a, ...b]) {
    const k = key(x)
    const prev = map.get(k)
    map.set(k, prev === undefined ? x : pick(prev, x))
  }
  return [...map.values()]
}

/** L'item più aggiornato è quello con più ripassi; a parità, quello che scade più tardi. */
function newerItem(a: ItemRecord, b: ItemRecord): ItemRecord {
  if (a.card.reps !== b.card.reps) return a.card.reps > b.card.reps ? a : b
  return new Date(a.card.due).getTime() >= new Date(b.card.due).getTime() ? a : b
}

/** Unisce i dati di due dispositivi senza perdere niente: ripassi e sessioni si sommano, il resto vince il più recente. */
export function mergeSyncData(local: SyncData, remote: SyncData | null): SyncData {
  if (!remote) return local
  const remoteNewer = remote.settingsUpdatedAt > local.settingsUpdatedAt
  return {
    format: SYNC_FORMAT,
    version: SYNC_VERSION,
    settingsUpdatedAt: Math.max(local.settingsUpdatedAt, remote.settingsUpdatedAt),
    settings: remoteNewer
      ? { ...local.settings, ...remote.settings }
      : { ...remote.settings, ...local.settings },
    items: unionBy(local.items, remote.items, (i) => i.id, newerItem),
    reviews: unionBy(local.reviews, remote.reviews, reviewKey, (x) => x),
    sessions: unionBy(local.sessions, remote.sessions, sessionKey, (x, y) =>
      (y.endedAt ?? 0) > (x.endedAt ?? 0) ? y : x,
    ),
    userTexts: unionBy(local.userTexts, remote.userTexts, textKey, (x, y) =>
      y.updatedAt > x.updatedAt ? y : x,
    ),
    attempts: unionBy(local.attempts, remote.attempts, attemptKey, (x) => x),
  }
}

export function serializeSyncData(data: SyncData): string {
  return JSON.stringify(encodeDates(data))
}

export function parseSyncData(text: string): SyncData {
  const data = decodeDates(JSON.parse(text)) as SyncData
  if (data?.format !== SYNC_FORMAT) throw new Error('File di sincronizzazione non valido')
  return data
}

/**
 * Applica i dati uniti sul dispositivo: sostituisce le tabelle sincronizzate (non l'audio),
 * ricollega le risposte del colloquio alle loro sessioni e alle registrazioni locali.
 */
export async function applySyncData(
  data: SyncData,
  database: AppDatabase = defaultDb,
): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.items,
      database.reviews,
      database.sessions,
      database.userTexts,
      database.attempts,
      database.settings,
    ],
    async () => {
      const localAttempts = await database.attempts.toArray()
      const localRecording = new Map(localAttempts.map((a) => [attemptKey(a), a.recordingId]))

      await Promise.all([
        database.items.clear(),
        database.reviews.clear(),
        database.sessions.clear(),
        database.userTexts.clear(),
        database.attempts.clear(),
      ])
      await database.items.bulkAdd(data.items)
      await database.reviews.bulkAdd(data.reviews)
      const ids = (await database.sessions.bulkAdd(data.sessions, { allKeys: true })) as number[]
      const idByKey = new Map(data.sessions.map((s, i) => [sessionKey(s), ids[i] as number]))
      await database.userTexts.bulkAdd(data.userTexts)
      await database.attempts.bulkAdd(
        data.attempts.map(({ sessionKey: key, ...a }) => ({
          ...a,
          sessionId: idByKey.get(key) ?? -1,
          recordingId: localRecording.get(attemptKey(a)) ?? undefined,
        })),
      )
      await database.settings.bulkPut([
        ...Object.entries(data.settings).map(([key, value]) => ({ key, value })),
        { key: SETTINGS_UPDATED_AT, value: data.settingsUpdatedAt },
      ])
    },
  )
}
