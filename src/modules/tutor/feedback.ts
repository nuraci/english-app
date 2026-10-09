import { db } from '../../core/db/db'
import { getSettings } from '../../core/db/settings'

export const FEEDBACK_KIND = 'feedback'

export type FeedbackResult = 'sent' | 'saved'

/**
 * Suggerimenti dei beta tester: si salvano sempre sul telefono e, se il tutor è collegato,
 * arrivano anche al server (solo il testo, la versione e la pagina: niente dati personali).
 */
export async function sendFeedback(
  text: string,
  context: { page: string; version: string },
): Promise<FeedbackResult> {
  const now = Date.now()
  await db.userTexts.add({
    kind: FEEDBACK_KIND,
    title: context.page,
    text,
    createdAt: now,
    updatedAt: now,
  })
  const settings = await getSettings()
  if (!settings.tutorUrl || !settings.tutorCode || !navigator.onLine) return 'saved'
  try {
    const res = await fetch(`${settings.tutorUrl.replace(/\/+$/, '')}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.tutorCode}`,
        'X-Device-Id': settings.deviceId || 'anonymous-device',
      },
      body: JSON.stringify({ text, page: context.page, version: context.version }),
    })
    return res.ok ? 'sent' : 'saved'
  } catch {
    return 'saved'
  }
}
