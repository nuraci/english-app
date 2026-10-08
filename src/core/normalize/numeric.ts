import type { CompareResult } from './compare'
import { levenshtein } from './compare'

const UNITS: Record<string, number> = {
  zero: 0,
  oh: 0,
  nought: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
}
const TEENS: Record<string, number> = {
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
}
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}
const SCALES: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9 }
const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  thirtieth: 30,
  fortieth: 40,
  fiftieth: 50,
  sixtieth: 60,
  seventieth: 70,
  eightieth: 80,
  ninetieth: 90,
}
const REPEAT: Record<string, number> = { double: 2, triple: 3 }

type TokenType = 'zero' | 'unit' | 'teen' | 'tens' | 'hundred' | 'scale'

/** Cosa può seguire ogni tipo di parola dentro lo stesso numero ("forty" → "seven" sì, "four" → "zero" no). */
const NEXT: Record<TokenType, TokenType[]> = {
  zero: [],
  unit: ['hundred', 'scale'],
  teen: ['hundred', 'scale'],
  tens: ['unit', 'scale'],
  hundred: ['unit', 'teen', 'tens', 'scale'],
  scale: ['unit', 'teen', 'tens'],
}

function typeOf(word: string): TokenType | undefined {
  if (word === 'zero' || word === 'oh' || word === 'nought') return 'zero'
  if (word in UNITS) return 'unit'
  if (word in TEENS) return 'teen'
  if (word in TENS) return 'tens'
  if (word === 'hundred') return 'hundred'
  if (word in SCALES) return 'scale'
  return undefined
}

export function ordinalSuffix(n: number): string {
  const lastTwo = n % 100
  if (lastTwo >= 11 && lastTwo <= 13) return 'th'
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
}

/**
 * Sostituisce i numeri scritti in parole con le cifre, lasciando il resto del testo.
 * "forty-seven" → "47", "three point three" → "3 . 3", "nineteen eighty-four" → "19 84",
 * "twenty-first" → "21st", "double five" → "5 5", "minus forty" → "- 40".
 * Le parole che non continuano un numero ne iniziano uno nuovo: così le sequenze di cifre
 * ("four zero zero zero") diventano "4 0 0 0".
 */
export function wordsToDigits(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/(?<=[a-z])-(?=[a-z])/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out: string[] = []
  let total = 0
  let current = 0
  let last = null as TokenType | null

  const flush = () => {
    if (last !== null) out.push(String(total + current))
    total = 0
    current = 0
    last = null
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i] as string
    const next = words[i + 1]
    const type = typeOf(word)

    if (word === 'a' && next && (next === 'hundred' || next in SCALES)) {
      flush()
      current = 1
      last = 'unit'
      continue
    }
    if (
      word === 'and' &&
      last &&
      (last === 'hundred' || last === 'scale') &&
      next &&
      typeOf(next)
    ) {
      continue
    }
    if (word in REPEAT && next && next in UNITS) {
      flush()
      const digit = String(UNITS[next])
      out.push(...Array.from({ length: REPEAT[word] as number }, () => digit))
      i++
      continue
    }
    if (word in ORDINALS || word === 'hundredth' || word === 'thousandth') {
      const ord = ORDINALS[word]
      let value: number
      if (ord !== undefined && last === 'tens' && ord < 10) value = total + current + ord
      else if (ord !== undefined && (last === 'hundred' || last === 'scale'))
        value = total + current + ord
      else if (word === 'hundredth') value = total + (current || 1) * 100
      else if (word === 'thousandth') value = (total + (current || 1)) * 1000
      else {
        flush()
        value = ord as number
      }
      total = 0
      current = 0
      last = null
      out.push(`${value}${ordinalSuffix(value)}`)
      continue
    }
    if (type) {
      if (last !== null && !NEXT[last].includes(type)) flush()
      if (type === 'zero' || type === 'unit') current += UNITS[word] as number
      else if (type === 'teen') current += TEENS[word] as number
      else if (type === 'tens') current += TENS[word] as number
      else if (type === 'hundred') current = (current || 1) * 100
      else {
        total += (current || 1) * (SCALES[word] as number)
        current = 0
      }
      last = type
      continue
    }
    flush()
    if (word === 'point') out.push('.')
    else if (word === 'minus' || word === 'negative') out.push('-')
    else if (word === 'plus') out.push('+')
    else out.push(word)
  }
  flush()
  return out.join(' ')
}

const PREFIXES: Record<string, string> = {
  pico: 'p',
  nano: 'n',
  micro: 'u',
  milli: 'm',
  kilo: 'k',
  mega: 'm',
  giga: 'g',
}
const UNIT_WORDS: Record<string, string> = {
  ohm: 'ohm',
  volt: 'v',
  amp: 'a',
  ampere: 'a',
  hertz: 'hz',
  farad: 'f',
  second: 's',
  watt: 'w',
}
const UNIT_RE = new RegExp(
  `\\b(${Object.keys(PREFIXES).join('|')})?[- ]?(${Object.keys(UNIT_WORDS).join('|')})s?\\b`,
  'g',
)

/**
 * Chiave canonica per confrontare risposte numeriche, comunque siano scritte o dettate:
 * "47 kΩ", "47 kilo-ohms" e "forty-seven kilo ohms" → "47kohm";
 * "-40 °C to +125 °C" e "from minus forty to plus one hundred twenty-five degrees Celsius"
 * → "-40degcto+125degc". Maiuscole, spazi e trattini non contano.
 */
export function numericKey(input: string): string {
  let s = input.normalize('NFKC').toLowerCase()
  s = s
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[−–—]/g, '-')
    .replace(/[Ωω]/g, ' ohm ')
    .replace(/[µμ]/g, 'u')
    .replace(/±|\+\/-|\+-|\bplus or minus\b/g, ' ± ')
    .replace(/\bper ?cent\b|%/g, ' % ')
    .replace(/\bpeak[- ]to[- ]peak\b|\bp-p\b/g, ' pp ')
    .replace(/\bkilohms?\b/g, 'kilo ohm')
    .replace(/\b(a\.m\.|a\.m)/g, 'am')
    .replace(/\b(p\.m\.|p\.m)/g, 'pm')
    .replace(/\s*o'clock\b/g, ' :00')
    // Virgole non numeriche ("oh one six one, four nine six"): solo separatori.
    .replace(/,(?!\d)|(?<!\d),/g, ' ')
    .replace(/\bdegrees? (celsius|c)\b|°\s*c\b|\bcelsius\b/g, ' degc ')
    .replace(/\bdegrees?\b|°/g, ' deg ')
  s = s
    .replace(/\ba quarter\b/g, 'quarter')
    // Nomi delle lettere esadecimali come li trascrive il riconoscimento vocale.
    .replace(
      /\b(ay|bee|see|dee|ee|eff)\b/g,
      (m) => ({ ay: 'a', bee: 'b', see: 'c', dee: 'd', ee: 'e', eff: 'f' })[m] ?? m,
    )
  s = wordsToDigits(s)
  s = s.replace(UNIT_RE, (_, prefix: string | undefined, unit: string) => {
    return ` ${prefix ? PREFIXES[prefix] : ''}${UNIT_WORDS[unit]} `
  })
  s = s
    .replace(/\b(the|of|from|and)\b/g, ' ')
    // 1,000,000 → 1000000; 3,3 (virgola decimale italiana) → 3.3
    .replace(/\d{1,3}(?:,\d{3})+(?!\d)/g, (m) => m.replace(/,/g, ''))
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[\s,"'!?;]+/g, '')
    // +125 = 125 (il ± è un carattere a parte e resta)
    .replace(/\+(?=\d)/g, '')
    .replace(/\.(?!\d)/g, '')
    // "-40 °C to 125 °C" = "-40 to 125 °C": l'unità ripetuta sul primo estremo non conta.
    .replace(/([+-]?\d[\d.]*)([a-z%]+)to([+-]?\d[\d.]*)\2(?![a-z])/g, '$1to$3$2')
  return s
}

export type NumberErrorTag = 'teen-ty' | 'digits' | 'magnitude' | 'decimal' | 'sign' | 'other'

const TEEN_TY = new Set(['13:30', '14:40', '15:50', '16:60', '17:70', '18:80', '19:90'])

function numbersIn(key: string): string[] {
  return key.match(/\d+(?:\.\d+)?/g) ?? []
}

/** Riconosce il tipo di errore, per un feedback mirato e per le statistiche. */
export function classifyNumberError(expectedKey: string, givenKey: string): NumberErrorTag {
  const exp = numbersIn(expectedKey)
  const got = numbersIn(givenKey)
  if (exp.length === got.length) {
    for (let i = 0; i < exp.length; i++) {
      const a = Number(exp[i])
      const b = Number(got[i])
      if (TEEN_TY.has(`${Math.min(a, b)}:${Math.max(a, b)}`)) return 'teen-ty'
      // 113 vs 130, 1.5 vs 1.50 ecc.: anche dentro numeri più lunghi
      const tail = (n: number) => n % 100
      if (a >= 100 && b >= 100 && Math.floor(a / 100) === Math.floor(b / 100)) {
        if (TEEN_TY.has(`${Math.min(tail(a), tail(b))}:${Math.max(tail(a), tail(b))}`))
          return 'teen-ty'
      }
    }
  }
  if (
    expectedKey.replace(/^-/, '') === givenKey.replace(/^-/, '') ||
    expectedKey.replace(/-/g, '') === givenKey.replace(/-/g, '')
  ) {
    return 'sign'
  }
  const digitsOnly = (k: string) => k.replace(/[^\d]/g, '')
  const expDigits = digitsOnly(expectedKey)
  const gotDigits = digitsOnly(givenKey)
  if (expDigits && expDigits === gotDigits && expectedKey.includes('.') !== givenKey.includes('.'))
    return 'decimal'
  if (expDigits && expDigits === gotDigits) return 'magnitude'
  const significant = (k: string) => digitsOnly(k).replace(/^0+|0+$/g, '')
  if (expDigits && significant(expectedKey) === significant(givenKey) && significant(givenKey))
    return 'magnitude'
  const sorted = (d: string) => [...d].sort().join('')
  if (
    expDigits &&
    gotDigits &&
    (levenshtein(expDigits, gotDigits) <= 1 || sorted(expDigits) === sorted(gotDigits))
  ) {
    return 'digits'
  }
  return 'other'
}

export type NumericCompareResult = CompareResult & { errorTag?: NumberErrorTag }

/** Confronta una risposta numerica con le forme accettate (tutte equivalenti). */
export function compareNumeric(input: string, accepted: readonly string[]): NumericCompareResult {
  if (accepted.length === 0) throw new Error('Nessuna risposta accettata')
  const expected = accepted[0] as string
  const givenKey = numericKey(input)
  if (givenKey && accepted.some((a) => numericKey(a) === givenKey)) {
    return { correct: true, kind: 'exact', expected, diffs: [] }
  }
  const trimmed = input.trim()
  const diffs = trimmed ? [{ got: trimmed, expected }] : []
  if (!givenKey) return { correct: false, kind: 'wrong', expected, diffs }
  const errorTag = classifyNumberError(numericKey(expected), givenKey)
  const close = errorTag !== 'other'
  return { correct: false, kind: close ? 'close' : 'wrong', expected, diffs, errorTag }
}
