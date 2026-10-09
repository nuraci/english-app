import { normalize } from '../../core/normalize'
import type { Question } from './data'

/** Parole chiave della domanda presenti nella risposta (anche al plurale o con -ing/-ed). */
export function keywordsHit(transcript: string, keywords: readonly string[]): string[] {
  const text = ` ${normalize(transcript)} `
  return keywords.filter((k) => {
    const key = normalize(k)
    if (!key) return false
    const stem = key.replace(/(ing|ed|es|s)$/, '')
    const pattern = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z]*\\b`)
    return text.includes(` ${key} `) || pattern.test(text)
  })
}

export function wordCount(transcript: string): number {
  return normalize(transcript).split(' ').filter(Boolean).length
}

/** Parole al minuto: in un colloquio 100–150 è un ritmo comodo. */
export function wordsPerMinute(transcript: string, durationMs: number): number | null {
  if (durationMs < 5000) return null
  return Math.round(wordCount(transcript) / (durationMs / 60000))
}

export type DurationVerdict = 'short' | 'good' | 'long'

export function durationVerdict(
  durationMs: number,
  [min, max]: readonly [number, number],
): DurationVerdict {
  const seconds = durationMs / 1000
  if (seconds < min) return 'short'
  if (seconds > max) return 'long'
  return 'good'
}

export function formatDuration(durationMs: number): string {
  const total = Math.round(durationMs / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s} s`
}

/** Commento incoraggiante sulla durata, in italiano. */
export function durationComment(
  durationMs: number,
  question: Pick<Question, 'targetSeconds'>,
): string {
  const [min, max] = question.targetSeconds
  switch (durationVerdict(durationMs, question.targetSeconds)) {
    case 'short':
      return `Un po' breve: per questa domanda puntiamo a ${min}–${max} secondi. Prova ad aggiungere un esempio.`
    case 'long':
      return `Ricca! Ma oltre i ${max} secondi si rischia di perdere l'attenzione: prova a sintetizzare.`
    case 'good':
      return `Durata perfetta per questa domanda (${min}–${max} secondi).`
  }
}
