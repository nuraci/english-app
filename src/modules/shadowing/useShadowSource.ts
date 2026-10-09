import { useMemo } from 'react'
import { builtInSources, type ShadowSource } from './sources'
import { useUserSources } from './storage'

/** Trova una sorgente per id, tra quelle dell'app e quelle dell'utente. undefined = ancora in caricamento. */
export function useShadowSource(id: string | null): ShadowSource | null | undefined {
  // Il seme fisso per tutta la vita del componente: le frasi "a caso" non cambiano a ogni render.
  const builtIn = useMemo(() => builtInSources(), [])
  const user = useUserSources()
  if (!id) return null
  const found = builtIn.find((s) => s.id === id)
  if (found) return found
  if (!user) return undefined
  return user.find((s) => s.id === id) ?? null
}
