import { db } from '../../core/db/db'
import { normalize } from '../../core/normalize'
import { Rating, recordReview } from '../../core/srs'
import { verbItemId, verbs } from '../verbs/data'
import { decks, termItemId, trapItemId, trapList } from '../vocab/data'
import type { TutorErrorItem } from './client'

export type SrsMatch = { itemId: string; module: string; label: string }

/**
 * Collega un errore trovato dal tutor a un item dei moduli:
 * verbo irregolare → verbs, termine tecnico → vocab, -teen/-ty → numbers. Gli altri restano nel riepilogo.
 */
export function matchError(error: TutorErrorItem): SrsMatch | null {
  const key = normalize(error.key)
  if (!key) return null
  if (error.category === 'irregular_verb') {
    const verb = verbs.find((v) =>
      [v.base, ...v.past, ...v.participle].some((f) => normalize(f) === key),
    )
    return verb ? { itemId: verbItemId(verb), module: 'verbs', label: verb.base } : null
  }
  if (error.category === 'vocabulary') {
    for (const deck of decks) {
      const term = deck.terms.find((t) => normalize(t.en) === key)
      if (term) return { itemId: termItemId(deck, term), module: 'vocab', label: term.en }
    }
    const trap = trapList.words.find((w) => normalize(w.en) === key)
    return trap ? { itemId: trapItemId(trap), module: 'vocab', label: trap.en } : null
  }
  if (error.category === 'number') {
    const n = Number(error.key.replace(/[^\d]/g, ''))
    if ((n >= 13 && n <= 19) || (n >= 30 && n <= 90 && n % 10 === 0)) {
      return { itemId: 'numbers:L1:teen-ty', module: 'numbers', label: '-teen / -ty' }
    }
  }
  return null
}

/** Gli errori riconosciuti tornano subito nei ripassi dei moduli (voto "Again"). */
export async function errorsToSrs(
  errors: readonly TutorErrorItem[],
  now = new Date(),
): Promise<SrsMatch[]> {
  const matches = new Map<string, SrsMatch>()
  for (const e of errors) {
    const m = matchError(e)
    if (m) matches.set(m.itemId, m)
  }
  for (const m of matches.values()) {
    const item = await recordReview(m.itemId, m.module, Rating.Again, {
      correct: false,
      answer: 'tutor',
      expected: m.label,
      now,
    })
    // Da ripassare subito, alla prossima sessione del modulo (non tra un minuto come un normale "Again").
    await db.items.update(m.itemId, { due: now.getTime(), card: { ...item.card, due: now } })
  }
  return [...matches.values()]
}
