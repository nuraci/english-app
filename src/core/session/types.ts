export type AnswerMode = 'type' | 'choice' | 'speak' | 'selfgrade'

export type Exercise = {
  /**
   * Identifica l'item SRS. Più esercizi sullo stesso item usano un suffisso dopo "#":
   * "verbs:write#sentence" e "verbs:write#past" aggiornano entrambi l'item "verbs:write".
   */
  id: string
  module: string
  prompt: { text?: string; speak?: string; hint?: string }
  answer: { accepted: string[]; mode: AnswerMode; choices?: string[] }
  /** Spiegazione in italiano, mostrata dopo la risposta. */
  explanation?: string
  /** Testo da far ascoltare con la risposta (es. "write, wrote, written"). */
  say?: string
}

const VARIANT_SEPARATOR = '#'
const RETRY_SUFFIX = `${VARIANT_SEPARATOR}retry`

/** L'item SRS a cui si riferisce l'esercizio. */
export function itemIdOf(exercise: Pick<Exercise, 'id'>): string {
  return exercise.id.split(VARIANT_SEPARATOR)[0] ?? exercise.id
}

/** Copia dell'esercizio da riproporre a fine sessione. */
export function retryOf(exercise: Exercise): Exercise {
  return { ...exercise, id: `${exercise.id}${RETRY_SUFFIX}` }
}

export function isRetry(exerciseId: string): boolean {
  return exerciseId.endsWith(RETRY_SUFFIX)
}

/** Autovalutazione: come è andata secondo l'utente. */
export type SelfGrade = 'again' | 'hard' | 'good' | 'easy'

export type Response =
  | { kind: 'text'; value: string }
  /** Trascrizioni alternative del riconoscimento vocale, dalla più probabile. */
  | { kind: 'speech'; transcripts: string[] }
  | { kind: 'self'; grade: SelfGrade }
