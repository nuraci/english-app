import { generateNumberItem } from '../../content/generators/numbers'
import type { ItemRecord } from '../../core/db/db'
import { pick, shuffle, type Rng } from '../../core/random'
import type { Exercise } from '../../core/session'
import { numberLevels, skillId } from './data'
import { numberExercise, type NumberMode } from './exercises'

export const NUMBER_SESSION_LENGTH = 15
/** Quota di esercizi mirati sugli errori ricorrenti in una sessione normale. */
const TARGETED_SHARE = 0.2
const READ_SHARE = 0.3

export type Speed = 'normal' | 'ramp'

/** Dove allenare ogni tipo di errore. */
export const ERROR_DRILLS: Record<string, { level: number; kinds: string[] }> = {
  'teen-ty': { level: 1, kinds: ['teen-ty'] },
  digits: { level: 4, kinds: ['phone', 'code'] },
  magnitude: { level: 5, kinds: ['resistance', 'capacitance', 'current', 'frequency'] },
  decimal: { level: 3, kinds: ['decimal'] },
  sign: { level: 3, kinds: ['negative'] },
}

/** Velocità crescente: da 0.9× a 1.35× la velocità impostata, lungo la sessione. */
export function rateAt(index: number, total: number, speed: Speed): number {
  if (speed === 'normal' || total <= 1) return 1
  return Number((0.9 + (0.45 * index) / (total - 1)).toFixed(2))
}

export type NumberSessionOptions = {
  /** Livello scelto; se manca e c'è `focus`, si allena solo l'errore. */
  level?: number
  /** Errore da allenare in modo mirato (es. "teen-ty"). */
  focus?: string
  /** Errori ricorrenti dell'utente: una parte della sessione li riprende. */
  recurring?: string[]
  /** Item SRS delle abilità: quelle scadute escono più spesso. */
  skills?: readonly ItemRecord[]
  speed: Speed
  rng: Rng
  now?: Date
  length?: number
}

/** Compone una sessione di numeri: varianti sempre nuove, con priorità ai punti deboli. */
export function buildNumberSession(options: NumberSessionOptions): Exercise[] {
  const { rng, speed, length = NUMBER_SESSION_LENGTH } = options
  const now = (options.now ?? new Date()).getTime()
  const due = new Set((options.skills ?? []).filter((s) => s.due <= now).map((s) => s.id))

  type Slot = { level: number; kind: string }
  const slots: Slot[] = []

  const focusDrill = options.focus ? ERROR_DRILLS[options.focus] : undefined
  if (focusDrill) {
    const drill = focusDrill
    for (let i = 0; i < length; i++)
      slots.push({ level: drill.level, kind: pick(drill.kinds, rng) })
  } else {
    const level = numberLevels.find((l) => l.level === options.level) ?? numberLevels[0]
    if (!level) return []
    const drills = (options.recurring ?? [])
      .map((t) => ERROR_DRILLS[t])
      .filter((d) => d !== undefined)
    const targeted = drills.length ? Math.round(length * TARGETED_SHARE) : 0
    for (let i = 0; i < targeted; i++) {
      const drill = drills[i % drills.length] as (typeof drills)[number]
      slots.push({ level: drill.level, kind: pick(drill.kinds, rng) })
    }
    // Le abilità da ripassare (SRS) contano doppio nella scelta.
    const weighted = level.kinds.flatMap((k) => (due.has(skillId(level.level, k)) ? [k, k] : [k]))
    // Prima un giro su tutti i tipi del livello, poi a caso: così ogni tipo compare.
    const cycle = shuffle(level.kinds, rng)
    while (slots.length < length) {
      const kind = cycle.shift() ?? pick(weighted, rng)
      slots.push({ level: level.level, kind })
    }
  }

  return shuffle(slots, rng).map((slot, i) => {
    const mode: NumberMode = rng() < READ_SHARE ? 'read' : 'listen'
    const item = generateNumberItem(slot.level, slot.kind, rng)
    return numberExercise(item, mode, i, rateAt(i, length, speed))
  })
}
