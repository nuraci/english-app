import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ReviewRecord } from '../../core/db/db'
import { MODULE } from './data'
import { RECENT_REVIEWS } from './stats'

export function useSpellingReviews(): ReviewRecord[] | undefined {
  return useLiveQuery(
    () =>
      db.reviews
        .orderBy('reviewedAt')
        .reverse()
        .filter((r) => r.module === MODULE)
        .limit(RECENT_REVIEWS)
        .toArray(),
    [],
  )
}
