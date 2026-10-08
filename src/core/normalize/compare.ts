import { normalize } from './normalize'
import { NUMBER_WORDS } from './numberToWords'

export type MatchKind = 'exact' | 'typo' | 'close' | 'wrong'

export type WordDiff = { got: string; expected: string }

export type CompareResult = {
  /** true per 'exact' e 'typo': un piccolo refuso non toglie il punto. */
  correct: boolean
  kind: MatchKind
  /** La risposta accettata più vicina a quella data, nella forma originale. */
  expected: string
  /** Parole diverse, se le due frasi hanno la stessa lunghezza: servono al feedback. */
  diffs: WordDiff[]
}

/** Lunghezza minima di una parola perché un carattere sbagliato valga come refuso. */
const TYPO_MIN_LENGTH = 6

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
    }
    prev = curr
  }
  return prev[b.length] ?? 0
}

function isTypo(got: string, expected: string): boolean {
  if (NUMBER_WORDS.has(got) || NUMBER_WORDS.has(expected)) return false
  if (Math.min(got.length, expected.length) < TYPO_MIN_LENGTH) return false
  return levenshtein(got, expected) === 1
}

function compareOne(input: string, accepted: string) {
  const got = normalize(input)
  const exp = normalize(accepted)
  if (got === exp) return { kind: 'exact' as const, distance: 0, diffs: [] }
  const gotWords = got.split(' ')
  const expWords = exp.split(' ')
  const diffs: WordDiff[] = []
  if (gotWords.length === expWords.length) {
    gotWords.forEach((g, i) => {
      const e = expWords[i] ?? ''
      if (g !== e) diffs.push({ got: g, expected: e })
    })
  }
  const distance = levenshtein(got, exp)
  if (diffs.length > 0 && diffs.every((d) => isTypo(d.got, d.expected))) {
    return { kind: 'typo' as const, distance, diffs }
  }
  const close = got.length > 0 && distance <= Math.max(2, Math.ceil(exp.length * 0.4))
  return { kind: close ? ('close' as const) : ('wrong' as const), distance, diffs }
}

const RANK: Record<MatchKind, number> = { exact: 0, typo: 1, close: 2, wrong: 3 }

/**
 * Confronta una risposta con tutte quelle accettate e restituisce il risultato migliore.
 * Tollera maiuscole, punteggiatura, spazi, cifre/parole ("47" = "forty-seven") e simboli ("Ω" = "ohm").
 */
export function compareAnswer(input: string, accepted: readonly string[]): CompareResult {
  if (accepted.length === 0) throw new Error('Nessuna risposta accettata')
  let best: (ReturnType<typeof compareOne> & { expected: string }) | undefined
  for (const candidate of accepted) {
    const r = { ...compareOne(input, candidate), expected: candidate }
    if (
      !best ||
      RANK[r.kind] < RANK[best.kind] ||
      (RANK[r.kind] === RANK[best.kind] && r.distance < best.distance)
    ) {
      best = r
    }
  }
  const result = best as NonNullable<typeof best>
  return {
    correct: result.kind === 'exact' || result.kind === 'typo',
    kind: result.kind,
    expected: result.expected,
    diffs: result.diffs,
  }
}
