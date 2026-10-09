import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { Correction, TutorTurn } from './client'
import type { SrsMatch } from './srs'

export const SUMMARY_KIND = 'tutor-summary'

export type TutorSummary = {
  mode: 'interview' | 'conversation'
  topic?: string
  startedAt: number
  endedAt: number
  summary: string
  corrections: Correction[]
  transcript: { role: 'user' | 'assistant'; text: string }[]
  addedToReview: SrsMatch[]
  costUsd: number
}

/** Salva il riepilogo della sessione (solo sul dispositivo) e la sessione per serie e XP. */
export async function saveTutorSummary(summary: TutorSummary): Promise<number> {
  const userTurns = summary.transcript.filter((t) => t.role === 'user').length
  await db.sessions.add({
    module: 'tutor',
    startedAt: summary.startedAt,
    endedAt: summary.endedAt,
    total: userTurns,
    correct: Math.max(0, userTurns - summary.corrections.length),
  })
  const id = (await db.userTexts.add({
    kind: SUMMARY_KIND,
    title: summary.mode,
    text: JSON.stringify(summary),
    createdAt: summary.endedAt,
    updatedAt: summary.endedAt,
  })) as number
  void import('../../core/sync/drive').then((m) => m.syncQuietly())
  return id
}

export async function tutorHistory(): Promise<(TutorSummary & { id: number })[]> {
  const rows = await db.userTexts.where('kind').equals(SUMMARY_KIND).reverse().sortBy('createdAt')
  return rows.map((r) => ({ ...(JSON.parse(r.text) as TutorSummary), id: r.id as number }))
}

export function useTutorHistory() {
  return useLiveQuery(tutorHistory, [])
}

/** Storia per l'API: i turni dell'assistente come li ha prodotti il modello. */
export function historyFor(
  turns: readonly { role: 'user' | 'assistant'; text: string; raw?: string }[],
): TutorTurn[] {
  return turns.map((t) => ({
    role: t.role,
    content: t.role === 'assistant' ? (t.raw ?? t.text) : t.text,
  }))
}
