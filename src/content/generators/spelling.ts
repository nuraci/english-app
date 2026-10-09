/**
 * Spelling: come si dice una sequenza di lettere, cifre e simboli,
 * più generatori di email e numeri di serie (varianti infinite per i dettati).
 */
import type { Accent } from '../../core/db/settings'
import { pick, type Rng } from '../../core/random'
import spelling from '../spelling.json'

export type SpellingCategory = 'part' | 'acronym' | 'name' | 'email' | 'serial'
export type SpellingItem = { text: string; category: SpellingCategory }

const LETTERS = new Map(spelling.letters.map((l) => [l.letter, l]))
const SYMBOLS: Record<string, string> = spelling.symbols
const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

/** Nome di un carattere come lo legge la voce: "H" → "aitch", "Z" → "zed"/"zee", "@" → "at". */
export function charName(char: string, accent: Accent = 'en-US'): string {
  const upper = char.toUpperCase()
  if (upper === 'Z') return accent === 'en-US' ? spelling.zUs : 'zed'
  const letter = LETTERS.get(upper)
  if (letter) return letter.say
  if (/\d/.test(char)) return DIGITS[Number(char)] as string
  return SYMBOLS[char] ?? char
}

/**
 * Spelling da far leggere alla voce, con una pausa tra un carattere e l'altro.
 * Due caratteri uguali di fila si dicono "double": "RSS" → "ar, double ess".
 */
export function spellOut(text: string, accent: Accent = 'en-US'): string {
  const parts: string[] = []
  const chars = [...text.toUpperCase()]
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i] as string
    if (c === ' ') continue
    if (chars[i + 1] === c && /[A-Z0-9]/.test(c)) {
      parts.push(`double ${charName(c, accent)}`)
      i++
    } else {
      parts.push(charName(c, accent))
    }
  }
  return parts.join(', ')
}

/** Versione leggibile per lo schermo: "S · T · M · 3 · 2". */
export function spellReadable(text: string): string {
  return [...text.toUpperCase()].filter((c) => c !== ' ').join(' · ')
}

/** Alfabeto NATO, cifre e simboli in parole: "Sierra Tango Mike three two". */
export function natoSpelling(text: string): string {
  return [...text.toUpperCase()]
    .filter((c) => c !== ' ')
    .map((c) => LETTERS.get(c)?.nato ?? charName(c))
    .join(' ')
}

/** Lettera → gruppi trappola a cui appartiene, per riconoscere le confusioni. */
export const LETTER_GROUPS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  for (const g of spelling.groups) for (const l of g.letters) (map[l] ??= []).push(g.id)
  return map
})()

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

export function generateEmail(rng: Rng): string {
  const first = pick(spelling.emailParts.first, rng)
  const last = pick(
    spelling.codes.name.filter((n) => /^[A-Za-z]+$/.test(n)),
    rng,
  ).toLowerCase()
  const domain = pick(spelling.emailParts.domains, rng)
  const nn = String(int(rng, 1, 99))
  return pick(
    [
      `${first}.${last}@${domain}`,
      `${first[0]}${last}@${domain}`,
      `${last}_${first}${nn}@${domain}`,
      `${first}-${last}@${domain}`,
      `${first[0]}.${last}${nn}@${domain}`,
    ],
    rng,
  )
}

/** Numeri di serie con lettere e cifre che si confondono apposta (B/D/E, G/J, 0/O…). */
export function generateSerial(rng: Rng): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  const group = () =>
    Array.from({ length: 4 }, () => alphabet[int(rng, 0, alphabet.length - 1)]).join('')
  return `${group()}-${group()}`
}

export const spellingCodes: SpellingItem[] = (['part', 'acronym', 'name'] as const).flatMap(
  (category) => spelling.codes[category].map((text) => ({ text, category })),
)
