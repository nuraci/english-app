// @vitest-environment node
// In Node i Blob sono veri: la simulazione di IndexedDB li conserva (con jsdom diventerebbero oggetti vuoti).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createEmptyCard } from 'ts-fsrs'
import { AppDatabase } from './db/db'
import {
  BackupError,
  backupFileName,
  deleteAllData,
  exportData,
  importData,
  parseBackup,
  readBlob,
} from './backup'

describe('backup', () => {
  let source: AppDatabase
  let target: AppDatabase
  const due = new Date('2026-10-10T08:00:00Z')

  beforeEach(async () => {
    source = new AppDatabase(`src-${crypto.randomUUID()}`)
    target = new AppDatabase(`dst-${crypto.randomUUID()}`)
    const card = { ...createEmptyCard(due), due }
    await source.items.add({
      id: 'verbs:write',
      module: 'verbs',
      card,
      due: due.getTime(),
      createdAt: 1,
    })
    await source.reviews.add({
      itemId: 'verbs:write',
      module: 'verbs',
      rating: 3,
      correct: true,
      reviewedAt: 2,
    })
    await source.settings.put({ key: 'accent', value: 'en-GB' })
    await source.userTexts.add({
      kind: 'surname',
      title: 'Cognome',
      text: 'Bianchi',
      createdAt: 3,
      updatedAt: 3,
    })
    await source.recordings.add({
      blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 900,
      createdAt: 4,
    })
    await target.settings.put({ key: 'accent', value: 'en-US' })
  })
  afterEach(async () => {
    await source.delete()
    await target.delete()
  })

  it('esporta e reimporta tutto, date e audio compresi', async () => {
    const backup = await exportData('0.11.0', source)
    const text = JSON.stringify(backup)
    await importData(parseBackup(text), target)

    const item = await target.items.get('verbs:write')
    expect(item?.card.due).toBeInstanceOf(Date)
    expect(item?.card.due.getTime()).toBe(due.getTime())
    expect(await target.reviews.count()).toBe(1)
    expect((await target.settings.get('accent'))?.value).toBe('en-GB')
    expect((await target.userTexts.toArray())[0]?.text).toBe('Bianchi')
    const rec = (await target.recordings.toArray())[0]
    expect(rec?.blob.type).toBe('audio/webm')
    expect([...new Uint8Array(await readBlob(rec?.blob as Blob))]).toEqual([1, 2, 3, 250])
  })

  it('rifiuta file che non sono backup, o di versioni future', () => {
    expect(() => parseBackup('ciao')).toThrow(BackupError)
    expect(() => parseBackup('{"format":"altro"}')).toThrow(BackupError)
    expect(() =>
      parseBackup(JSON.stringify({ format: 'techtalk-coach-backup', version: 99, tables: {} })),
    ).toThrow(/più recente/)
  })

  it('cancella tutti i dati', async () => {
    await deleteAllData(source)
    for (const t of [
      'items',
      'reviews',
      'sessions',
      'settings',
      'userTexts',
      'attempts',
      'recordings',
    ]) {
      expect(await source.table(t).count(), t).toBe(0)
    }
  })

  it('nome del file con la data', () => {
    expect(backupFileName(new Date('2026-10-09T12:00:00Z'))).toBe('techtalk-coach-2026-10-09.json')
  })
})
