import packsContent from '../content/packs.json'

/** Pacchetti di contenuti per settore: il base è sempre attivo, gli altri si scelgono nelle impostazioni. */
export type Pack = { id: string; name: string; description: string }

export const packs: Pack[] = packsContent.packs
export const BASE_PACK = 'semiconductors'

/** I pacchetti attivi: il base più quelli scelti (solo se esistono). */
export function activePacksOf(chosen: readonly string[]): string[] {
  const set = new Set([BASE_PACK, ...chosen])
  return packs.filter((p) => set.has(p.id)).map((p) => p.id)
}
