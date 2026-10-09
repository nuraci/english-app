import { useLiveQuery } from 'dexie-react-hooks'
import { db, type AttemptRecord, type SessionRecord } from '../../core/db/db'
import { ANSWER_KIND, MODULE } from './data'

export async function startInterviewSession(total: number, now = Date.now()): Promise<number> {
  return db.sessions.add({ module: MODULE, startedAt: now, total, correct: 0 }) as Promise<number>
}

export async function finishInterviewSession(
  id: number,
  answered: number,
  now = Date.now(),
): Promise<void> {
  await db.sessions.update(id, { endedAt: now, correct: answered })
  void import('../../core/sync/drive').then((m) => m.syncQuietly())
}

/** Salva una risposta con l'eventuale registrazione audio (che resta sul dispositivo). */
export async function saveAttempt(
  attempt: Omit<AttemptRecord, 'id' | 'module' | 'recordingId' | 'createdAt'>,
  recording?: { blob: Blob; mimeType: string; durationMs: number },
  now = Date.now(),
): Promise<number> {
  return db.transaction('rw', db.attempts, db.recordings, async () => {
    const recordingId = recording
      ? ((await db.recordings.add({ ...recording, createdAt: now })) as number)
      : undefined
    return (await db.attempts.add({
      ...attempt,
      module: MODULE,
      recordingId,
      createdAt: now,
    })) as number
  })
}

export async function updateAttemptChecklist(id: number, checklist: string[]): Promise<void> {
  await db.attempts.update(id, { checklist })
}

/** Elimina una prova con tutte le sue risposte e registrazioni. */
export async function deleteInterviewSession(id: number): Promise<void> {
  await db.transaction('rw', db.sessions, db.attempts, db.recordings, async () => {
    const attempts = await db.attempts.where('sessionId').equals(id).toArray()
    const recordingIds = attempts
      .map((a) => a.recordingId)
      .filter((r): r is number => r !== undefined)
    await db.recordings.bulkDelete(recordingIds)
    await db.attempts.where('sessionId').equals(id).delete()
    await db.sessions.delete(id)
  })
}

export async function practiceCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  await db.attempts
    .where('createdAt')
    .above(0)
    .each((a) => counts.set(a.questionId, (counts.get(a.questionId) ?? 0) + 1))
  return counts
}

export type InterviewHistoryEntry = {
  session: SessionRecord & { id: number }
  attempts: AttemptRecord[]
}

export async function interviewHistory(): Promise<InterviewHistoryEntry[]> {
  const sessions = await db.sessions.where('module').equals(MODULE).reverse().sortBy('startedAt')
  return Promise.all(
    sessions
      .filter((s): s is SessionRecord & { id: number } => s.id !== undefined)
      .map(async (session) => ({
        session,
        attempts: await db.attempts.where('sessionId').equals(session.id).sortBy('createdAt'),
      })),
  )
}

export function useInterviewHistory(): InterviewHistoryEntry[] | undefined {
  return useLiveQuery(interviewHistory, [])
}

// ── Risposte scritte dall'utente ────────────────────────────────────────────

export async function getMyAnswers(): Promise<Record<string, string>> {
  const rows = await db.userTexts.where('kind').equals(ANSWER_KIND).toArray()
  return Object.fromEntries(rows.map((r) => [r.title, r.text]))
}

export async function saveMyAnswer(
  questionId: string,
  text: string,
  now = Date.now(),
): Promise<void> {
  await db.transaction('rw', db.userTexts, async () => {
    const existing = await db.userTexts
      .where('kind')
      .equals(ANSWER_KIND)
      .filter((r) => r.title === questionId)
      .first()
    if (existing?.id !== undefined) await db.userTexts.update(existing.id, { text, updatedAt: now })
    else
      await db.userTexts.add({
        kind: ANSWER_KIND,
        title: questionId,
        text,
        createdAt: now,
        updatedAt: now,
      })
  })
}

export function useMyAnswers(): Record<string, string> | undefined {
  return useLiveQuery(getMyAnswers, [])
}
