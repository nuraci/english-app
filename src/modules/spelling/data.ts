import spelling from '../../content/spelling.json'
import type { SpellingCategory } from '../../content/generators/spelling'

export const MODULE = 'spelling'

export type Letter = { letter: string; say: string; it: string; nato: string }
export type LetterGroup = { id: string; name: string; tip: string; letters: string[] }
export type PersonalField = { kind: 'name' | 'surname' | 'email'; label: string; question: string }

export const letters: Letter[] = spelling.letters
export const letterGroups: LetterGroup[] = spelling.groups
export const categoryLabels: Record<SpellingCategory, string> = spelling.categories
export const personalFields = spelling.personal as PersonalField[]
export const groupTips: Record<string, string> = Object.fromEntries(
  letterGroups.map((g) => [g.id, g.tip]),
)

/** Le lettere trappola per gli italiani, nell'ordine in cui conviene impararle. */
export const TRAP_LETTERS: string[] = [
  ...new Set(
    letterGroups
      .filter((g) => g.id !== 'ee' && g.id !== 'mn' && g.id !== 'sf')
      .flatMap((g) => g.letters),
  ),
]

export const letterItemId = (letter: string) => `${MODULE}:letter:${letter}`
export const codeItemId = (text: string) => `${MODULE}:code:${text}`
export const skillItemId = (category: 'email' | 'serial') => `${MODULE}:${category}`
export const personalItemId = (kind: string) => `${MODULE}:personal:${kind}`
