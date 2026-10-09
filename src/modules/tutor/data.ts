import tutor from '../../content/tutor.json'

export type TutorMode = 'interview' | 'conversation'
export type Topic = { id: string; label: string; topic: string }

export const MODULE = 'tutor'
export const topics: Topic[] = tutor.topics
export const modes: Record<TutorMode, { title: string; description: string }> = tutor.modes
export const INTERVIEW_MINUTES = 15
/** Oltre questo tempo il colloquio si chiude da solo al turno successivo. */
export const INTERVIEW_HARD_STOP_MINUTES = 17
