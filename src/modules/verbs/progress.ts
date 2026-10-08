import { State } from 'ts-fsrs'
import type { ItemRecord } from '../../core/db/db'
import { LEVEL_SIZE, levelOf, verbItemId, type Verb, type VerbGroup } from './data'

export type VerbStatus = 'new' | 'learning' | 'learned'

/** Quota di verbi imparati in un livello per sbloccare il successivo. */
export const UNLOCK_RATIO = 0.7

export type LevelProgress = {
  level: number
  total: number
  /** Verbi già visti almeno una volta. */
  seen: number
  learned: number
  unlocked: boolean
}

export type VerbsProgress = {
  statuses: Map<string, VerbStatus>
  levels: LevelProgress[]
  /** Il livello più alto sbloccato. */
  unlockedLevel: number
  /** Gruppo da cui arrivano i verbi nuovi; undefined se sono stati visti tutti. */
  currentGroup?: VerbGroup
  /** Verbi nuovi del gruppo corrente, nei livelli sbloccati, dal più frequente. */
  nextNewVerbs: Verb[]
}

export function statusOf(item: ItemRecord | undefined): VerbStatus {
  if (!item) return 'new'
  return item.card.state === State.Review ? 'learned' : 'learning'
}

/**
 * Calcola lo stato del modulo dai record SRS.
 * Si sblocca un livello alla volta (prima i 50 verbi più frequenti) e, dentro i livelli
 * sbloccati, si impara un gruppo alla volta: si finisce il gruppo iniziato prima di aprirne un altro.
 */
export function computeProgress(
  verbs: readonly Verb[],
  groups: readonly VerbGroup[],
  items: readonly ItemRecord[],
): VerbsProgress {
  const byId = new Map(items.map((i) => [i.id, i]))
  const statuses = new Map(verbs.map((v) => [v.base, statusOf(byId.get(verbItemId(v)))]))

  const levelCount = Math.ceil(verbs.length / LEVEL_SIZE)
  const levels: LevelProgress[] = []
  let unlockedLevel = 1
  for (let level = 1; level <= levelCount; level++) {
    const inLevel = verbs.filter((v) => levelOf(v) === level)
    const seen = inLevel.filter((v) => statuses.get(v.base) !== 'new').length
    const learned = inLevel.filter((v) => statuses.get(v.base) === 'learned').length
    const unlocked = level <= unlockedLevel
    levels.push({ level, total: inLevel.length, seen, learned, unlocked })
    const complete = seen === inLevel.length && learned >= Math.ceil(inLevel.length * UNLOCK_RATIO)
    if (unlocked && complete && level < levelCount) unlockedLevel = level + 1
  }
  for (const l of levels) l.unlocked = l.level <= unlockedLevel

  const available = verbs.filter((v) => levelOf(v) <= unlockedLevel)
  const fresh = available.filter((v) => statuses.get(v.base) === 'new')
  const started = new Set(
    available.filter((v) => statuses.get(v.base) !== 'new').map((v) => v.group),
  )
  // Un gruppo già iniziato ha la precedenza; altrimenti quello del verbo nuovo più frequente.
  const nextVerb = fresh.find((v) => started.has(v.group)) ?? fresh[0]
  const currentGroup = nextVerb ? groups.find((g) => g.id === nextVerb.group) : undefined
  const nextNewVerbs = currentGroup ? fresh.filter((v) => v.group === currentGroup.id) : []

  return { statuses, levels, unlockedLevel, currentGroup, nextNewVerbs }
}
