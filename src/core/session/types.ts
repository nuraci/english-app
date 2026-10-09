export type AnswerMode = 'type' | 'choice' | 'speak' | 'selfgrade'

export type Exercise = {
  /**
   * Identifica l'item SRS. Più esercizi sullo stesso item usano un suffisso dopo "#":
   * "verbs:write#sentence" e "verbs:write#past" aggiornano entrambi l'item "verbs:write".
   */
  id: string
  module: string
  prompt: {
    text?: string
    speak?: string
    hint?: string
    /** Legge `speak` appena l'esercizio compare (esercizi di ascolto). */
    autoplay?: boolean
    /** Moltiplicatore della velocità di lettura rispetto alle impostazioni. */
    rate?: number
  }
  answer: {
    accepted: string[]
    mode: AnswerMode
    choices?: string[]
    /**
     * 'number': confronto numerico ("47k" = "47 kΩ" = "forty-seven kilo-ohms").
     * 'spelling': lettera per lettera; a voce capisce i nomi delle lettere ("ess tee em").
     */
    match?: 'text' | 'number' | 'spelling'
    /** Spelling: trattini facoltativi (part number), non nelle email. */
    ignoreDash?: boolean
    /** Spelling: gruppi di lettere che si confondono, per riconoscere l'errore. */
    letterGroups?: Record<string, string[]>
    /** Testo mostrato nell'autovalutazione, se diverso dalla prima risposta accettata. */
    reveal?: string
    /** Cosa fare negli esercizi parlati senza microfono, se diverso dalle impostazioni. */
    fallback?: 'type' | 'selfgrade'
  }
  /** Spiegazione in italiano, mostrata dopo la risposta. */
  explanation?: string
  /** Testo da far ascoltare con la risposta (es. "write, wrote, written"). */
  say?: string
  /** Spiegazioni mirate per tipo di errore (es. "teen-ty"), al posto di `explanation`. */
  tips?: Record<string, string>
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
