import { Dexie, type EntityTable } from 'dexie'
import type { Card, Rating } from 'ts-fsrs'

/** Un elemento da ripassare (un verbo, un numero, una parola...) con il suo stato FSRS. */
export type ItemRecord = {
  /** Uguale all'id dell'esercizio, es. "verbs:go:past". */
  id: string
  module: string
  card: Card
  /** Copia di card.due in millisecondi, indicizzata per trovare i ripassi scaduti. */
  due: number
  createdAt: number
}

export type ReviewRecord = {
  id?: number
  itemId: string
  module: string
  rating: Rating
  correct: boolean
  /** Risposta data dall'utente, utile per le statistiche sugli errori ricorrenti. */
  answer?: string
  /** Risposta attesa (per gli item generati, dove l'id non basta a ricostruirla). */
  expected?: string
  /** Tipo di errore riconosciuto, es. "teen-ty". */
  errorTag?: string
  reviewedAt: number
}

export type SessionRecord = {
  id?: number
  module: string
  startedAt: number
  endedAt?: number
  total: number
  correct: number
}

export type SettingRecord = { key: string; value: unknown }

export type UserTextRecord = {
  id?: number
  /** Tipo di testo: "name", "email", "interview-answer"... */
  kind: string
  title: string
  text: string
  createdAt: number
  updatedAt: number
}

export class AppDatabase extends Dexie {
  items!: EntityTable<ItemRecord, 'id'>
  reviews!: EntityTable<ReviewRecord, 'id'>
  sessions!: EntityTable<SessionRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>
  userTexts!: EntityTable<UserTextRecord, 'id'>

  constructor(name = 'techtalk-coach') {
    super(name)
    this.version(1).stores({
      items: 'id, module, [module+due]',
      reviews: '++id, itemId, module, reviewedAt',
      sessions: '++id, module, startedAt',
      settings: 'key',
      userTexts: '++id, kind, updatedAt',
    })
  }
}

export const db = new AppDatabase()
