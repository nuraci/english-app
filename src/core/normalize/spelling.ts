import type { CompareResult, WordDiff } from './compare'
import { wordsToDigits } from './numeric'

/** Operazione di allineamento tra risposta e soluzione, carattere per carattere. */
export type CharOp =
  | { op: 'ok'; char: string }
  | { op: 'sub'; got: string; expected: string }
  | { op: 'missing'; expected: string }
  | { op: 'extra'; got: string }

/** Come il riconoscimento vocale trascrive i nomi delle lettere (e l'alfabeto NATO). */
const LETTER_WORDS: Record<string, string> = {
  a: 'A',
  ay: 'A',
  eh: 'A',
  alfa: 'A',
  alpha: 'A',
  b: 'B',
  be: 'B',
  bee: 'B',
  bravo: 'B',
  c: 'C',
  see: 'C',
  sea: 'C',
  charlie: 'C',
  d: 'D',
  dee: 'D',
  delta: 'D',
  e: 'E',
  ee: 'E',
  echo: 'E',
  f: 'F',
  ef: 'F',
  eff: 'F',
  foxtrot: 'F',
  g: 'G',
  gee: 'G',
  jee: 'G',
  golf: 'G',
  h: 'H',
  aitch: 'H',
  haitch: 'H',
  hotel: 'H',
  i: 'I',
  eye: 'I',
  india: 'I',
  j: 'J',
  jay: 'J',
  juliet: 'J',
  juliett: 'J',
  k: 'K',
  kay: 'K',
  kilo: 'K',
  l: 'L',
  el: 'L',
  ell: 'L',
  lima: 'L',
  m: 'M',
  em: 'M',
  mike: 'M',
  n: 'N',
  en: 'N',
  november: 'N',
  o: 'O',
  oh: 'O',
  oscar: 'O',
  p: 'P',
  pee: 'P',
  pea: 'P',
  papa: 'P',
  q: 'Q',
  cue: 'Q',
  queue: 'Q',
  quebec: 'Q',
  r: 'R',
  ar: 'R',
  are: 'R',
  romeo: 'R',
  s: 'S',
  es: 'S',
  ess: 'S',
  sierra: 'S',
  t: 'T',
  tee: 'T',
  tea: 'T',
  tango: 'T',
  u: 'U',
  you: 'U',
  uniform: 'U',
  v: 'V',
  vee: 'V',
  victor: 'V',
  w: 'W',
  whiskey: 'W',
  whisky: 'W',
  x: 'X',
  ex: 'X',
  'x-ray': 'X',
  xray: 'X',
  y: 'Y',
  why: 'Y',
  yankee: 'Y',
  z: 'Z',
  zed: 'Z',
  zee: 'Z',
  zulu: 'Z',
}
const NATO_WORDS = new Set([
  'alfa',
  'alpha',
  'bravo',
  'charlie',
  'delta',
  'echo',
  'foxtrot',
  'golf',
  'hotel',
  'india',
  'juliet',
  'juliett',
  'kilo',
  'lima',
  'mike',
  'november',
  'oscar',
  'papa',
  'quebec',
  'romeo',
  'sierra',
  'tango',
  'uniform',
  'victor',
  'whiskey',
  'whisky',
  'x-ray',
  'xray',
  'yankee',
  'zulu',
])
const SYMBOL_WORDS: Record<string, string> = {
  at: '@',
  dot: '.',
  point: '.',
  underscore: '_',
  dash: '-',
  hyphen: '-',
  minus: '-',
  slash: '/',
  apostrophe: "'",
  space: ' ',
}
const REPEAT: Record<string, number> = { double: 2, triple: 3 }

/**
 * Converte uno spelling dettato in caratteri:
 * "ess tee em three two" → "STM32", "double you" → "W", "double five" → "55",
 * "S as in Sierra" → "S", "mario dot rossi at example dot com" → "MARIO.ROSSI@EXAMPLE.COM".
 */
export function spokenToChars(transcript: string): string {
  const words = wordsToDigits(
    transcript
      .toLowerCase()
      .replace(/\bdouble[- ]u\b|\bdouble you\b/g, ' w ')
      // Nello spelling "oh" è la lettera O (lo zero si dice "zero"; a voce O e 0 valgono comunque uguali).
      .replace(/\boh\b/g, ' o ')
      .replace(/[,;:!?]/g, ' '),
  )
    .split(/\s+/)
    .filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < words.length; i++) {
    const word = words[i] as string
    // "S as in Sierra", "S for Sierra": la parola NATO ripete la lettera appena detta.
    if ((word === 'as' || word === 'for') && out.length) {
      const nato = words[i + 1] === 'in' ? words[i + 2] : words[i + 1]
      if (nato && NATO_WORDS.has(nato)) {
        i += words[i + 1] === 'in' ? 2 : 1
        continue
      }
    }
    const repeat = REPEAT[word]
    if (repeat && words[i + 1]) {
      const next = toChars(words[i + 1] as string)
      out.push(next.repeat(repeat))
      i++
      continue
    }
    out.push(toChars(word))
  }
  return out.join('')
}

function toChars(word: string): string {
  if (LETTER_WORDS[word]) return LETTER_WORDS[word]
  if (SYMBOL_WORDS[word] !== undefined) return SYMBOL_WORDS[word]
  // Cifre, sigle già scritte come lettere ("stm32"), indirizzi già trascritti.
  return word.toUpperCase()
}

export type SpellingOptions = {
  /** Risposta dettata a voce: prima si convertono i nomi delle lettere. */
  spoken?: boolean
  /** Trattini facoltativi (part number come ESP32-S3); nelle email invece contano. */
  ignoreDash?: boolean
  /** Gruppi di lettere che si confondono: lettera → id dei gruppi. */
  letterGroups?: Record<string, string[]>
}

export function spellingKey(text: string, options: SpellingOptions = {}): string {
  let s = options.spoken ? spokenToChars(text) : text.normalize('NFKC').toUpperCase()
  s = s.replace(/\s+/g, '')
  if (options.ignoreDash) s = s.replace(/-/g, '')
  return s
}

/** A voce "oh" può essere la lettera O o lo zero: per il confronto valgono uguali. */
const sameO = (s: string) => s.replace(/O/g, '0')

/** Riporta i caratteri originali in un allineamento fatto su stringhe trasformate 1:1. */
function restore(ops: CharOp[], got: string, expected: string): CharOp[] {
  let i = 0
  let j = 0
  return ops.map((o) => {
    switch (o.op) {
      case 'ok':
        i++
        return { op: 'ok', char: expected[j++] as string }
      case 'sub':
        return { op: 'sub', got: got[i++] as string, expected: expected[j++] as string }
      case 'missing':
        return { op: 'missing', expected: expected[j++] as string }
      case 'extra':
        return { op: 'extra', got: got[i++] as string }
    }
  })
}

/** Allineamento minimo (Levenshtein) tra due stringhe, come lista di operazioni. */
export function alignChars(got: string, expected: string): CharOp[] {
  const a = [...got]
  const b = [...expected]
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      ;(d[i] as number[])[j] = Math.min(
        (d[i - 1]?.[j] ?? 0) + 1,
        (d[i]?.[j - 1] ?? 0) + 1,
        (d[i - 1]?.[j - 1] ?? 0) + cost,
      )
    }
  }
  const ops: CharOp[] = []
  let i = a.length
  let j = b.length
  while (i > 0 || j > 0) {
    const here = d[i]?.[j] ?? 0
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && here === d[i - 1]?.[j - 1]) {
      ops.push({ op: 'ok', char: b[j - 1] as string })
      i--
      j--
    } else if (i > 0 && j > 0 && here === (d[i - 1]?.[j - 1] ?? 0) + 1) {
      ops.push({ op: 'sub', got: a[i - 1] as string, expected: b[j - 1] as string })
      i--
      j--
    } else if (j > 0 && here === (d[i]?.[j - 1] ?? 0) + 1) {
      ops.push({ op: 'missing', expected: b[j - 1] as string })
      j--
    } else {
      ops.push({ op: 'extra', got: a[i - 1] as string })
      i--
    }
  }
  return ops.reverse()
}

export type SpellingCompareResult = CompareResult & { errorTag?: string; charOps: CharOp[] }

function distance(ops: CharOp[]): number {
  return ops.filter((o) => o.op !== 'ok').length
}

/** Primo scambio di lettere che appartengono allo stesso gruppo trappola. */
function confusionTag(
  ops: CharOp[],
  groups: Record<string, string[]> | undefined,
): string | undefined {
  if (!groups) return undefined
  for (const o of ops) {
    if (o.op !== 'sub') continue
    const shared = (groups[o.expected] ?? []).find((g) => (groups[o.got] ?? []).includes(g))
    if (shared) return shared
  }
  return undefined
}

/** Confronta uno spelling lettera per lettera, scegliendo la soluzione più vicina. */
export function compareSpelling(
  input: string,
  accepted: readonly string[],
  options: SpellingOptions = {},
): SpellingCompareResult {
  if (accepted.length === 0) throw new Error('Nessuna risposta accettata')
  const got = spellingKey(input, options)
  let best: { expected: string; ops: CharOp[] } | undefined
  for (const candidate of accepted) {
    const exp = spellingKey(candidate, { ...options, spoken: false })
    const ops = options.spoken
      ? restore(alignChars(sameO(got), sameO(exp)), got, exp)
      : alignChars(got, exp)
    if (!best || distance(ops) < distance(best.ops)) best = { expected: candidate, ops }
  }
  const { expected, ops } = best as NonNullable<typeof best>
  const errors = distance(ops)
  if (errors === 0) return { correct: true, kind: 'exact', expected, diffs: [], charOps: ops }

  const diffs: WordDiff[] = ops.flatMap((o) =>
    o.op === 'sub'
      ? [{ got: o.got, expected: o.expected }]
      : o.op === 'missing'
        ? [{ got: '', expected: o.expected }]
        : o.op === 'extra'
          ? [{ got: o.got, expected: '' }]
          : [],
  )
  const length = Math.max(1, ops.length)
  const close = got.length > 0 && (errors <= 2 || errors / length <= 0.25)
  const errorTag = confusionTag(ops, options.letterGroups)
  return {
    correct: false,
    kind: close ? 'close' : 'wrong',
    expected,
    diffs,
    charOps: ops,
    ...(errorTag ? { errorTag } : {}),
  }
}
