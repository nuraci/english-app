import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ItemRecord } from '../../core/db/db'
import { MODULE } from './data'

/** Record SRS dei verbi, aggiornati in tempo reale; undefined finché si caricano. */
export function useVerbItems(): ItemRecord[] | undefined {
  return useLiveQuery(() => db.items.where('module').equals(MODULE).toArray(), [])
}

/** Quanti verbi sono da ripassare adesso. */
export function useDueVerbCount(): number | undefined {
  return useLiveQuery(
    () =>
      db.items
        .where('[module+due]')
        .between([MODULE, -Infinity], [MODULE, Date.now()], true, true)
        .count(),
    [],
  )
}
