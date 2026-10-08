import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import { db as defaultDb, type AppDatabase, type ItemRecord } from '../db/db'

// enable_fuzz sparpaglia un po' le scadenze: evita che tanti item scadano tutti lo stesso giorno.
const scheduler = fsrs({ enable_fuzz: true })

// -Infinity è la chiave numerica più piccola in IndexedDB.
const MIN_KEY = -Infinity

export { Rating }
export type { Grade }

/** Calcola il nuovo stato di una card dopo un ripasso. Funzione pura. */
export function scheduleReview(card: Card, grade: Grade, now: Date): Card {
  return scheduler.next(card, now, grade).card
}

export function newItem(id: string, module: string, now: Date): ItemRecord {
  const card = createEmptyCard(now)
  return { id, module, card, due: card.due.getTime(), createdAt: now.getTime() }
}

/** Crea gli item che non esistono ancora; quelli esistenti restano invariati. */
export async function ensureItems(
  module: string,
  ids: readonly string[],
  now = new Date(),
  database: AppDatabase = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.items, async () => {
    const existing = await database.items.bulkGet([...ids])
    const missing = ids.filter((_, i) => !existing[i])
    if (missing.length > 0) {
      await database.items.bulkAdd(missing.map((id) => newItem(id, module, now)))
    }
  })
}

/** I primi n item di un modulo da ripassare entro `now`, dal più scaduto. */
export async function getDueItems(
  module: string,
  n: number,
  now = new Date(),
  database: AppDatabase = defaultDb,
): Promise<ItemRecord[]> {
  return database.items
    .where('[module+due]')
    .between([module, MIN_KEY], [module, now.getTime()], true, true)
    .limit(n)
    .toArray()
}

/** Registra un ripasso: aggiorna lo stato FSRS dell'item e salva il log. */
export async function recordReview(
  itemId: string,
  module: string,
  grade: Grade,
  options: {
    correct: boolean
    answer?: string
    expected?: string
    errorTag?: string
    now?: Date
  } = { correct: grade !== Rating.Again },
  database: AppDatabase = defaultDb,
): Promise<ItemRecord> {
  const now = options.now ?? new Date()
  return database.transaction('rw', database.items, database.reviews, async () => {
    const item = (await database.items.get(itemId)) ?? newItem(itemId, module, now)
    const card = scheduleReview(item.card, grade, now)
    const updated: ItemRecord = { ...item, card, due: card.due.getTime() }
    await database.items.put(updated)
    await database.reviews.add({
      itemId,
      module,
      rating: grade,
      correct: options.correct,
      answer: options.answer,
      expected: options.expected,
      errorTag: options.errorTag,
      reviewedAt: now.getTime(),
    })
    return updated
  })
}
