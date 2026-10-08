import { db as defaultDb, type AppDatabase } from '../db/db'
import { recordReview } from '../srs'
import type { Evaluation } from './evaluate'
import { itemIdOf, type Exercise } from './types'

/** Salva l'esito di un esercizio nel motore di ripasso. */
export async function saveAnswer(
  exercise: Exercise,
  evaluation: Evaluation,
  now = new Date(),
  database: AppDatabase = defaultDb,
) {
  return recordReview(
    itemIdOf(exercise),
    exercise.module,
    evaluation.grade,
    { correct: evaluation.correct, answer: evaluation.given || undefined, now },
    database,
  )
}

export async function saveSession(
  session: { module: string; startedAt: number; total: number; correct: number },
  now = new Date(),
  database: AppDatabase = defaultDb,
) {
  return database.sessions.add({ ...session, endedAt: now.getTime() })
}
