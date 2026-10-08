import type { Exercise } from '../core/session'
import debugContent from './debug.json'

export const debugSentence: string = debugContent.sentence
export const debugExercises: Exercise[] = debugContent.exercises as Exercise[]
