import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ItemRecord, type ReviewRecord } from '../../core/db/db'
import { MODULE } from './data'
import { RECENT_REVIEWS } from './stats'

export function recentNumberReviews(): Promise<ReviewRecord[]> {
  return db.reviews
    .orderBy('reviewedAt')
    .reverse()
    .filter((r) => r.module === MODULE)
    .limit(RECENT_REVIEWS)
    .toArray()
}

export function numberSkills(): Promise<ItemRecord[]> {
  return db.items.where('module').equals(MODULE).toArray()
}

/** Ripassi recenti dei numeri, aggiornati in tempo reale. */
export function useNumberReviews(): ReviewRecord[] | undefined {
  return useLiveQuery(recentNumberReviews, [])
}
