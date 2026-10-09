import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/db'
import type { ShadowSource } from './sources'

export const SUBTITLES_KIND = 'subtitles'

/** Salva un file di sottotitoli importato come sorgente di shadowing (solo sul dispositivo). */
export async function saveSubtitles(
  name: string,
  lines: string[],
  now = Date.now(),
): Promise<number> {
  return (await db.userTexts.add({
    kind: SUBTITLES_KIND,
    title: name,
    text: JSON.stringify(lines),
    createdAt: now,
    updatedAt: now,
  })) as number
}

export async function deleteSubtitles(id: number): Promise<void> {
  await db.userTexts.delete(id)
}

/** Le sorgenti create dall'utente: sottotitoli importati e risposte del colloquio. */
export async function userSources(): Promise<ShadowSource[]> {
  const rows = await db.userTexts
    .where('kind')
    .anyOf([SUBTITLES_KIND, 'interview-answer'])
    .toArray()
  const subtitles: ShadowSource[] = rows
    .filter((r) => r.kind === SUBTITLES_KIND)
    .map((r) => ({
      id: `srt-${r.id}`,
      name: r.title,
      description: 'Sottotitoli importati',
      items: (JSON.parse(r.text) as string[]).map((text) => ({ text })),
    }))
  const answers = rows.filter((r) => r.kind === 'interview-answer' && r.text.trim())
  const mine: ShadowSource[] = answers.length
    ? [
        {
          id: 'my-answers',
          name: 'Le tue risposte del colloquio',
          description: 'Quelle che hai scritto nel simulatore di colloquio.',
          items: answers.flatMap((r) => r.text.split(/(?<=[.!?])\s+/).map((text) => ({ text }))),
        },
      ]
    : []
  return [...mine, ...subtitles]
}

export function useUserSources(): ShadowSource[] | undefined {
  return useLiveQuery(userSources, [])
}
