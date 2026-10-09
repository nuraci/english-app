import interview from '../../content/interview.json'

export const MODULE = 'interview'

export type QuestionCategory = 'hr' | 'technical' | 'behavioral'

export type Question = {
  id: string
  category: QuestionCategory
  text: string
  it: string
  tip: string
  keywords: string[]
  /** Durata consigliata della risposta, in secondi [min, max]. */
  targetSeconds: [number, number]
  /** Domanda comportamentale da rispondere con il metodo STAR. */
  star?: boolean
  /** Risposta modello in inglese semplice, da personalizzare. */
  sample?: string
}

export type Phrase = { en: string; it: string; when?: string }
export type TellMeStep = { id: string; title: string; help: string; starters: string[] }
export type ChecklistItem = { id: string; label: string }

export const questions = interview.questions as Question[]
export const categoryNames: Record<QuestionCategory, string> = interview.categories
export const checklist: ChecklistItem[] = interview.checklist
export const tellMeSteps: TellMeStep[] = interview.tellMe
export const lifesavers: Phrase[] = interview.lifesavers
export const questionsToAsk: Phrase[] = interview.questionsToAsk

export const TELL_ME_ID = 'tell-me'
export const LAST_QUESTION_ID = 'any-questions'

export function questionById(id: string): Question | undefined {
  return questions.find((q) => q.id === id)
}

/** Le risposte scritte dall'utente stanno in userTexts con questo kind e l'id della domanda come titolo. */
export const ANSWER_KIND = 'interview-answer'
