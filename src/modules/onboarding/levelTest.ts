import { generateNumberItem } from '../../content/generators/numbers'
import { spellingCodes } from '../../content/generators/spelling'
import type { Accent } from '../../core/db/settings'
import { pick, shuffle, type Rng } from '../../core/random'
import { itemIdOf, type Evaluation, type Exercise } from '../../core/session'
import { numberExercise } from '../numbers/exercises'
import { dictationExercise } from '../spelling/exercises'
import { verbs } from '../verbs/data'
import { formExercise } from '../verbs/exercises'
import { decksFor } from '../vocab/data'
import { meaningExercise } from '../vocab/exercises'

export type Area = 'verbs' | 'numbers' | 'spelling' | 'vocab'
export const AREAS: Area[] = ['verbs', 'numbers', 'spelling', 'vocab']

export const AREA_NAMES: Record<Area, string> = {
  verbs: 'Verbi irregolari',
  numbers: 'Numeri in ascolto',
  spelling: 'Spelling',
  vocab: 'Vocabolario tecnico',
}

/**
 * Test di livello da circa 5 minuti: 16 esercizi rapidi, dal più facile al più difficile in ogni area.
 * Verbi (4) · numeri in ascolto (5) · spelling dettato (3) · significato dei termini tecnici (4).
 */
export function buildLevelTest(rng: Rng, accent: Accent): Exercise[] {
  // Verbi: due tra i più comuni, due meno frequenti.
  const easy = shuffle(verbs.slice(0, 30), rng).slice(0, 2)
  const hard = shuffle(verbs.slice(50, 120), rng).slice(0, 2)
  const verbExercises = [...easy, ...hard].map((v, i) =>
    formExercise(v, i % 2 ? 'participle' : 'past'),
  )

  // Numeri: dalle coppie trappola alle misure e all'esadecimale.
  const numberSlots: [number, string][] = [
    [1, 'teen-ty'],
    [2, 'year'],
    [3, 'decimal'],
    [5, pick(['resistance', 'frequency', 'voltage'], rng)],
    [7, 'hex'],
  ]
  const numberExercises = numberSlots.map(([level, kind], i) =>
    numberExercise(generateNumberItem(level, kind, rng), 'listen', i),
  )

  // Spelling: una sigla, un part number, un cognome.
  const spellingExercises = (['acronym', 'part', 'name'] as const).map((category, i) =>
    dictationExercise(
      pick(
        spellingCodes.filter((c) => c.category === category),
        rng,
      ),
      { accent, nato: false },
      i,
    ),
  )

  // Vocabolario: significato di quattro termini del pacchetto base.
  const decks = decksFor(['semiconductors'])
  const vocabExercises = shuffle(decks, rng)
    .slice(0, 4)
    .map((d) => meaningExercise(d, pick(d.terms, rng), rng))

  return [...verbExercises, ...numberExercises, ...spellingExercises, ...vocabExercises]
}

export type AreaScore = { correct: number; total: number; label: string }
export type LevelResult = {
  areas: Record<Area, AreaScore>
  /** Stima indicativa, non una certificazione. */
  overall: 'A2' | 'B1' | 'B2'
  recommendations: string[]
  numbersStartLevel: number
}

function labelOf(ratio: number): string {
  if (ratio >= 0.75) return 'Solido'
  if (ratio >= 0.4) return 'In crescita'
  return 'Da costruire'
}

const areaOf = (exerciseId: string): Area | undefined => {
  const module = itemIdOf({ id: exerciseId }).split(':')[0]
  return AREAS.find((a) => a === module)
}

/** Punteggio per area e consigli su dove partire (sempre in positivo). */
export function scoreLevelTest(
  results: readonly { exerciseId: string; evaluation: Evaluation }[],
): LevelResult {
  const areas = Object.fromEntries(
    AREAS.map((a) => [a, { correct: 0, total: 0, label: '' }]),
  ) as Record<Area, AreaScore>
  for (const r of results) {
    const area = areaOf(r.exerciseId)
    if (!area || r.exerciseId.endsWith('#retry')) continue
    areas[area].total++
    if (r.evaluation.correct) areas[area].correct++
  }
  for (const a of AREAS)
    areas[a].label = labelOf(areas[a].total ? areas[a].correct / areas[a].total : 0)

  const total = AREAS.reduce((s, a) => s + areas[a].total, 0)
  const correct = AREAS.reduce((s, a) => s + areas[a].correct, 0)
  const ratio = total ? correct / total : 0
  const overall = ratio >= 0.8 ? 'B2' : ratio >= 0.5 ? 'B1' : 'A2'

  const ordered = [...AREAS].sort(
    (x, y) => areas[x].correct / (areas[x].total || 1) - areas[y].correct / (areas[y].total || 1),
  )
  const weakest = ordered[0] as Area
  const strongest = ordered[ordered.length - 1] as Area
  const numbersRatio = areas.numbers.total ? areas.numbers.correct / areas.numbers.total : 0
  const numbersStartLevel = numbersRatio >= 0.8 ? 3 : numbersRatio >= 0.5 ? 2 : 1

  const recommendations = [
    `Il tuo punto di forza: ${AREA_NAMES[strongest].toLowerCase()}. Ottima base da cui partire!`,
    `Da dove cominciare: ${AREA_NAMES[weakest].toLowerCase()}. La schermata Oggi ti proporrà prima questo.`,
    `Numeri: parti dal livello ${numbersStartLevel}.`,
  ]
  return { areas, overall, recommendations, numbersStartLevel }
}
