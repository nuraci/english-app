import { useSettings } from './db/settings'
import { usablePacks } from './plan'

/** I pacchetti di contenuti utilizzabili adesso (attivi e accessibili con il piano). */
export function usePacks(): string[] {
  const settings = useSettings()
  return usablePacks(settings.activePacks, settings.plan)
}
