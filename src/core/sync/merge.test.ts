import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createEmptyCard, Rating } from 'ts-fsrs'
import { AppDatabase } from '../db/db'
import { scheduleReview } from '../srs'
import {
  applySyncData,
  exportSyncData,
  mergeSyncData,
  parseSyncData,
  serializeSyncData,
} from './merge'

const t0 = new Date('2026-10-10T08:00:00Z')

async function seed(db: AppDatabase, who: 'phone' | 'pc') {
  const base = who === 'phone' ? 1000 : 2000
  // Stesso verbo ripassato una volta sul telefono, due sul PC.
  let card = createEmptyCard(t0)
  for (let i = 0; i < (who === 'phone' ? 1 : 2); i++) card = scheduleReview(card, Rating.Good, t0)
  await db.items.add({
    id: 'verbs:write',
    module: 'verbs',
    card,
    due: card.due.getTime(),
    createdAt: 1,
  })
  await db.items.add({
    id: `verbs:${who === 'phone' ? 'go' : 'see'}`,
    module: 'verbs',
    card: createEmptyCard(t0),
    due: t0.getTime(),
    createdAt: 1,
  })
  await db.reviews.add({
    itemId: 'verbs:write',
    module: 'verbs',
    rating: 3,
    correct: true,
    reviewedAt: base,
  })
  const sessionId = (await db.sessions.add({
    module: 'interview',
    startedAt: base,
    endedAt: base + 600,
    total: 10,
    correct: 10,
  })) as number
  const recordingId =
    who === 'phone'
      ? ((await db.recordings.add({
          blob: new Blob(['audio']),
          mimeType: 'audio/webm',
          durationMs: 5,
          createdAt: base,
        })) as number)
      : undefined
  await db.attempts.add({
    sessionId,
    module: 'interview',
    questionId: 'tell-me',
    question: 'Tell me about yourself.',
    transcript: who,
    durationMs: 60000,
    checklist: [],
    keywordsHit: [],
    recordingId,
    createdAt: base + 1,
  })
  await db.userTexts.add({
    kind: 'surname',
    title: 'Cognome',
    text: who === 'phone' ? 'Rossi' : 'Bianchi',
    createdAt: base,
    updatedAt: base,
  })
  await db.userTexts.add({
    kind: 'tutor-summary',
    title: 'interview',
    text: `{"from":"${who}"}`,
    createdAt: base,
    updatedAt: base,
  })
  await db.settings.bulkPut([
    { key: 'accent', value: who === 'phone' ? 'en-US' : 'en-GB' },
    { key: 'settingsUpdatedAt', value: base },
    { key: 'voiceURI', value: `${who}-voice` },
  ])
}

describe('sincronizzazione tra due dispositivi', () => {
  let phone: AppDatabase
  let pc: AppDatabase

  beforeEach(async () => {
    phone = new AppDatabase(`phone-${crypto.randomUUID()}`)
    pc = new AppDatabase(`pc-${crypto.randomUUID()}`)
    await seed(phone, 'phone')
    await seed(pc, 'pc')
  })
  afterEach(async () => {
    await phone.delete()
    await pc.delete()
  })

  it('unisce tutto senza perdere niente, e il risultato è uguale sui due dispositivi', async () => {
    // Il PC sincronizza per primo (Drive vuoto), poi il telefono, poi di nuovo il PC.
    const drive1 = mergeSyncData(await exportSyncData(pc), null)
    const drive2 = mergeSyncData(
      await exportSyncData(phone),
      parseSyncData(serializeSyncData(drive1)),
    )
    await applySyncData(drive2, phone)
    const drive3 = mergeSyncData(await exportSyncData(pc), parseSyncData(serializeSyncData(drive2)))
    await applySyncData(drive3, pc)

    for (const db of [phone, pc]) {
      expect(await db.items.count()).toBe(3)
      expect(await db.reviews.count()).toBe(2)
      expect(await db.sessions.count()).toBe(2)
      expect(await db.attempts.count()).toBe(2)
      // Testo modificabile: vince il più recente (il PC). Riepiloghi: si sommano.
      expect((await db.userTexts.where('kind').equals('surname').first())?.text).toBe('Bianchi')
      expect(await db.userTexts.where('kind').equals('tutor-summary').count()).toBe(2)
      // L'item con più ripassi vince, e le date restano Date.
      const write = await db.items.get('verbs:write')
      expect(write?.card.reps).toBe(2)
      expect(write?.card.due).toBeInstanceOf(Date)
      // Impostazioni condivise: vince la più recente; quelle del dispositivo restano sue.
      expect((await db.settings.get('accent'))?.value).toBe('en-GB')
    }
    expect((await phone.settings.get('voiceURI'))?.value).toBe('phone-voice')
    expect((await pc.settings.get('voiceURI'))?.value).toBe('pc-voice')
  })

  it('le risposte restano collegate alla loro sessione; l’audio resta sul telefono', async () => {
    const merged = mergeSyncData(await exportSyncData(phone), await exportSyncData(pc))
    await applySyncData(merged, phone)
    const attempts = await phone.attempts.toArray()
    for (const a of attempts) {
      const session = await phone.sessions.get(a.sessionId)
      expect(session?.startedAt, a.transcript).toBe(a.transcript === 'phone' ? 1000 : 2000)
    }
    const mine = attempts.find((a) => a.transcript === 'phone')
    const theirs = attempts.find((a) => a.transcript === 'pc')
    expect(mine?.recordingId).toBeDefined()
    expect(await phone.recordings.get(mine?.recordingId as number)).toBeDefined()
    expect(theirs?.recordingId).toBeUndefined()
    expect(await phone.recordings.count()).toBe(1)
  })

  it('sincronizzare due volte non crea doppioni', async () => {
    const once = mergeSyncData(await exportSyncData(phone), await exportSyncData(pc))
    await applySyncData(once, phone)
    const twice = mergeSyncData(await exportSyncData(phone), once)
    await applySyncData(twice, phone)
    expect(await phone.reviews.count()).toBe(2)
    expect(await phone.sessions.count()).toBe(2)
    expect(await phone.userTexts.count()).toBe(3)
  })

  it('l’audio non entra mai nei dati sincronizzati', async () => {
    const text = serializeSyncData(await exportSyncData(phone))
    expect(text).not.toContain('recordingId')
    expect(text).not.toContain('"blob"')
  })
})
