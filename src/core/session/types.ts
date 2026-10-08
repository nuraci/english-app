export type AnswerMode = 'type' | 'choice' | 'speak' | 'selfgrade'

export type Exercise = {
  id: string
  module: string
  prompt: { text?: string; speak?: string; hint?: string }
  answer: { accepted: string[]; mode: AnswerMode; choices?: string[] }
  /** Spiegazione in italiano, mostrata dopo la risposta. */
  explanation?: string
}

/** Autovalutazione: come è andata secondo l'utente. */
export type SelfGrade = 'again' | 'hard' | 'good' | 'easy'

export type Response =
  | { kind: 'text'; value: string }
  /** Trascrizioni alternative del riconoscimento vocale, dalla più probabile. */
  | { kind: 'speech'; transcripts: string[] }
  | { kind: 'self'; grade: SelfGrade }
