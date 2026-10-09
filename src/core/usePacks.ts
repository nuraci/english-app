import { useSettings } from './db/settings'
import { activePacksOf } from './packs'

/** I pacchetti di contenuti attivi adesso. */
export function usePacks(): string[] {
  return activePacksOf(useSettings().activePacks)
}
