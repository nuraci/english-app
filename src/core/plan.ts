import packsContent from '../content/packs.json'

/**
 * Freemium (solo predisposizione, nessun pagamento): i moduli base sono gratis,
 * Tutor AI e pacchetti di settore sono premium. Durante la beta è tutto sbloccato.
 */
export type Plan = 'free' | 'beta' | 'premium'

export type Feature = 'tutor' | `pack:${string}`

export type Pack = { id: string; name: string; description: string; premium: boolean }

export const packs: Pack[] = packsContent.packs
export const BASE_PACK = 'semiconductors'

export function isPremium(feature: Feature): boolean {
  if (feature === 'tutor') return true
  const pack = packs.find((p) => `pack:${p.id}` === feature)
  return pack?.premium ?? false
}

export function hasAccess(feature: Feature, plan: Plan): boolean {
  return !isPremium(feature) || plan !== 'free'
}

/** Pacchetti utilizzabili: attivi nelle impostazioni e accessibili con il piano (il base sempre). */
export function usablePacks(active: readonly string[], plan: Plan): string[] {
  const chosen = new Set([BASE_PACK, ...active])
  return packs.filter((p) => chosen.has(p.id) && hasAccess(`pack:${p.id}`, plan)).map((p) => p.id)
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Gratuito',
  beta: 'Beta: tutto incluso, gratis',
  premium: 'Premium',
}
