/**
 * Generatore di esercizi sui numeri: varianti infinite per ogni livello.
 * Ogni item ha il testo da mostrare, quello da far leggere alla voce e le risposte accettate
 * (tutte equivalenti per il confronto numerico: "47 kΩ", "47k", "47 kilo-ohms"...).
 */
import {
  integerToOrdinalWords,
  integerToWords,
  numberStringToWords,
  ordinalSuffix,
} from '../../core/normalize'
import { pick, type Rng } from '../../core/random'

export type NumberItem = {
  level: number
  kind: string
  /** Come appare scritto: "47 kΩ". */
  display: string
  /** Come si dice, per la sintesi vocale: "forty-seven kilo-ohms". */
  speak: string
  /** Forme accettate; la prima è quella mostrata come soluzione. */
  accepted: string[]
  /** Aiuto facoltativo, in italiano. */
  hint?: string
}

type Generator = (rng: Rng) => Omit<NumberItem, 'level' | 'kind'>

const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
const unique = (items: string[]) => [...new Set(items)]

/** Numero in cifre senza zeri finali inutili: 4.70 → "4.7". */
function fmt(value: number, decimals = 3): string {
  return String(Number(value.toFixed(decimals)))
}

/** Come numberStringToWords, ma accetta numeri. */
function say(value: number | string): string {
  return numberStringToWords(typeof value === 'number' ? fmt(value) : value)
}

const DIGIT_WORDS = ['oh', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

/** Cifre una per una, con "oh" e "double": "0155" → "oh one double five". */
export function speakDigits(digits: string, zero = 'oh'): string {
  const words: string[] = []
  for (let i = 0; i < digits.length;) {
    const d = Number(digits[i])
    let run = 1
    while (digits[i + run] === digits[i] && run < 3) run++
    const word = d === 0 ? zero : (DIGIT_WORDS[d] as string)
    if (run === 3) words.push(`triple ${word}`)
    else if (run === 2) words.push(`double ${word}`)
    else words.push(word)
    i += run
  }
  return words.join(' ')
}

// ── Livello 1 ────────────────────────────────────────────────────────────────

const cardinal = (n: number) => ({
  display: String(n),
  speak: integerToWords(n),
  accepted: [String(n)],
})

const small: Generator = (rng) => cardinal(int(rng, 0, 20))
const tens: Generator = (rng) => cardinal(int(rng, 21, 99))
const teenTy: Generator = (rng) => {
  const x = int(rng, 3, 9)
  return cardinal(rng() < 0.5 ? 10 + x : 10 * x)
}

// ── Livello 2 ────────────────────────────────────────────────────────────────

const big: Generator = (rng) => {
  const shapes = [
    () => int(rng, 101, 999),
    () => int(rng, 1001, 9999),
    () => int(rng, 2, 99) * 1000,
    () => int(rng, 10, 999) * 1000 + int(rng, 0, 9) * 100,
    () => int(rng, 1, 20) * 1_000_000 + pick([0, 0, 200_000, 500_000], rng),
    () => pick([1024, 2048, 4096, 8192, 16384, 32768, 65536], rng),
  ]
  const n = pick(shapes, rng)()
  const display = n.toLocaleString('en-US')
  return { display, speak: integerToWords(n), accepted: unique([display, String(n)]) }
}

const ordinal: Generator = (rng) => {
  const n = rng() < 0.7 ? int(rng, 1, 31) : int(rng, 32, 100)
  const display = `${n}${ordinalSuffix(n)}`
  return { display, speak: integerToOrdinalWords(n), accepted: [display, String(n)] }
}

export function speakYear(y: number, style: 'pairs' | 'thousand' = 'pairs'): string {
  if (y >= 2000 && y <= 2009) return integerToWords(y)
  if (style === 'thousand' && y >= 2000) return integerToWords(y)
  const hi = Math.floor(y / 100)
  const lo = y % 100
  if (lo === 0) return `${integerToWords(hi)} hundred`
  if (lo < 10) return `${integerToWords(hi)} oh ${integerToWords(lo)}`
  return `${integerToWords(hi)} ${integerToWords(lo)}`
}

const year: Generator = (rng) => {
  const y = int(rng, 1950, 2035)
  return {
    display: String(y),
    speak: speakYear(y, rng() < 0.3 ? 'thousand' : 'pairs'),
    accepted: [String(y)],
  }
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const date: Generator = (rng) => {
  const d = int(rng, 1, 28)
  const m = int(rng, 1, 12)
  const y = int(rng, 2020, 2030)
  const month = MONTHS[m - 1] as string
  const dth = `${d}${ordinalSuffix(d)}`
  const uk = rng() < 0.5
  const yearWords = speakYear(y)
  const textual = [
    `${d} ${month} ${y}`,
    `${dth} ${month} ${y}`,
    `${dth} of ${month} ${y}`,
    `${month} ${d}, ${y}`,
    `${month} ${dth}, ${y}`,
  ]
  const numeric = uk ? [`${d}/${m}/${y}`] : [`${m}/${d}/${y}`]
  return uk
    ? {
        display: `${d} ${month} ${y}`,
        speak: `the ${integerToOrdinalWords(d)} of ${month}, ${yearWords}`,
        accepted: unique([`${d} ${month} ${y}`, ...textual, ...numeric]),
        hint: 'Data in formato britannico',
      }
    : {
        display: `${month} ${d}, ${y}`,
        speak: `${month} ${integerToOrdinalWords(d)}, ${yearWords}`,
        accepted: unique([`${month} ${d}, ${y}`, ...textual, ...numeric]),
        hint: 'Data in formato americano',
      }
}

const time: Generator = (rng) => {
  const h = int(rng, 1, 12)
  const mm = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], rng)
  const pad = String(mm).padStart(2, '0')
  const next = (h % 12) + 1
  const digital =
    mm === 0
      ? `${integerToWords(h)} o'clock`
      : `${integerToWords(h)} ${mm < 10 ? `oh ${integerToWords(mm)}` : integerToWords(mm)}`
  const traditional =
    mm === 0
      ? `${integerToWords(h)} o'clock`
      : mm === 15
        ? `a quarter past ${integerToWords(h)}`
        : mm === 30
          ? `half past ${integerToWords(h)}`
          : mm === 45
            ? `a quarter to ${integerToWords(next)}`
            : mm < 30
              ? `${integerToWords(mm)} past ${integerToWords(h)}`
              : `${integerToWords(60 - mm)} to ${integerToWords(next)}`
  return {
    display: `${h}:${pad}`,
    speak: rng() < 0.5 ? digital : traditional,
    accepted: unique([
      `${h}:${pad}`,
      `${h + 12}:${pad}`,
      `${h}.${pad}`,
      `${String(h).padStart(2, '0')}:${pad}`,
      digital,
      traditional,
    ]),
    hint: 'Scrivi l’ora come 3:45',
  }
}

// ── Livello 3 ────────────────────────────────────────────────────────────────

const decimal: Generator = (rng) => {
  const intPart = rng() < 0.3 ? 0 : int(rng, 1, 99)
  const decimals = int(rng, 1, 2)
  const frac =
    String(int(rng, 1, 10 ** decimals - 1))
      .padStart(decimals, '0')
      .replace(/0+$/, '') || '5'
  const display = `${intPart}.${frac}`
  return { display, speak: say(display), accepted: [display] }
}

const negative: Generator = (rng) => {
  const n = int(rng, 1, 60)
  return { display: `-${n}`, speak: `minus ${integerToWords(n)}`, accepted: [`-${n}`] }
}

const percent: Generator = (rng) => {
  const v = rng() < 0.7 ? String(int(rng, 1, 100)) : `${int(rng, 0, 9)}.${int(rng, 1, 9)}`
  return { display: `${v}%`, speak: `${say(v)} percent`, accepted: [`${v}%`, `${v} percent`] }
}

const CURRENCIES = [
  { sym: '$', word: 'dollars', cents: 'cents' },
  { sym: '€', word: 'euros', cents: 'cents' },
  { sym: '£', word: 'pounds', cents: 'pence' },
]

const price: Generator = (rng) => {
  const c = pick(CURRENCIES, rng)
  const whole = pick([int(rng, 1, 99), int(rng, 100, 999), int(rng, 1, 20) * 50], rng)
  const cents = rng() < 0.6 ? pick([99, 50, 95, 49, 25, int(rng, 1, 98)], rng) : 0
  const amount = cents ? `${whole}.${String(cents).padStart(2, '0')}` : String(whole)
  const display = `${c.sym}${amount}`
  // La forma breve "twelve ninety-nine" è naturale solo sotto i 100: "six hundred sixty-eight" sarebbe 668.
  const speak = cents
    ? whole >= 100 || rng() < 0.5
      ? `${integerToWords(whole)} ${c.word} ${integerToWords(cents)}`
      : `${integerToWords(whole)} ${integerToWords(cents)}`
    : `${integerToWords(whole)} ${c.word}`
  return {
    display,
    speak,
    accepted: unique([
      display,
      amount,
      `${amount}${c.sym}`,
      `${amount} ${c.sym}`,
      `${amount} ${c.word}`,
      // Come si dice: "twelve dollars ninety-nine" o "twelve ninety-nine"
      ...(cents ? [`${whole} ${c.word} ${cents}`, `${whole} ${cents}`] : []),
    ]),
  }
}

// ── Livello 4 ────────────────────────────────────────────────────────────────

function randomDigits(rng: Rng, length: number, repeatChance = 0.3): string {
  let out = ''
  while (out.length < length) {
    const last = out.at(-1)
    out += last !== undefined && rng() < repeatChance ? last : String(int(rng, 0, 9))
  }
  return out
}

const phone: Generator = (rng) => {
  const groups = [`0${randomDigits(rng, 3)}`, randomDigits(rng, 3), randomDigits(rng, 4)]
  const display = groups.join(' ')
  return {
    display,
    speak: groups.map((g) => speakDigits(g)).join(', '),
    accepted: [display, groups.join('')],
  }
}

const CODE_LABELS = ['Room', 'Extension', 'PIN', 'Order number', 'Flight', 'Ticket']

const code: Generator = (rng) => {
  const label = pick(CODE_LABELS, rng)
  const digits = randomDigits(rng, int(rng, 3, 6), 0.35)
  return {
    display: `${label} ${digits}`,
    speak: `${label.toLowerCase()} ${speakDigits(digits)}`,
    accepted: [digits, `${label} ${digits}`],
    hint: 'Scrivi solo le cifre',
  }
}

// ── Livello 5 ────────────────────────────────────────────────────────────────

type Prefix = { sym: string; word: string; exp: number }
const P: Record<string, Prefix> = {
  p: { sym: 'p', word: 'pico', exp: -12 },
  n: { sym: 'n', word: 'nano', exp: -9 },
  u: { sym: 'µ', word: 'micro', exp: -6 },
  m: { sym: 'm', word: 'milli', exp: -3 },
  '': { sym: '', word: '', exp: 0 },
  k: { sym: 'k', word: 'kilo', exp: 3 },
  M: { sym: 'M', word: 'mega', exp: 6 },
  G: { sym: 'G', word: 'giga', exp: 9 },
}
const PREFIX_ORDER = ['p', 'n', 'u', 'm', '', 'k', 'M', 'G']

type Unit = { sym: string; word: string; plural: string }
const U = {
  ohm: { sym: 'Ω', word: 'ohm', plural: 'ohms' },
  volt: { sym: 'V', word: 'volt', plural: 'volts' },
  amp: { sym: 'A', word: 'amp', plural: 'amps' },
  hertz: { sym: 'Hz', word: 'hertz', plural: 'hertz' },
  farad: { sym: 'F', word: 'farad', plural: 'farads' },
  second: { sym: 's', word: 'second', plural: 'seconds' },
  watt: { sym: 'W', word: 'watt', plural: 'watts' },
} satisfies Record<string, Unit>

const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]

export type Quantity = {
  value: number
  prefix: string
  unit: Unit
  qualifier?: { text: string; short: string }
}

function unitWords(q: Quantity): string {
  const p = P[q.prefix] as Prefix
  const unit = q.value === 1 ? q.unit.word : q.unit.plural
  if (!p.word) return unit
  // "kilo-ohms", "mega-ohms": senza trattino le due vocali si fondono male nella lettura
  return q.unit.sym === 'Ω' ? `${p.word}-${unit}` : `${p.word}${unit}`
}

export function quantityDisplay(q: Quantity): string {
  const base = `${fmt(q.value)} ${(P[q.prefix] as Prefix).sym}${q.unit.sym}`
  return q.qualifier ? `${base}${q.qualifier.short}` : base
}

export function quantitySpeak(q: Quantity): string {
  const text = `${say(q.value)} ${unitWords(q)}`
  return q.qualifier ? `${text} ${q.qualifier.text}` : text
}

/** Forme accettate: simboli, parole, prefisso adiacente ("4700 Ω" = "4.7 kΩ"), notazione "4k7". */
export function quantityAccepted(q: Quantity): string[] {
  const p = P[q.prefix] as Prefix
  const v = fmt(q.value)
  const sym = `${p.sym}${q.unit.sym}`
  const forms = [`${v} ${sym}`, `${v}${sym}`, `${v} ${unitWords(q)}`]
  const idx = PREFIX_ORDER.indexOf(q.prefix)
  for (const other of [PREFIX_ORDER[idx - 1], PREFIX_ORDER[idx + 1]]) {
    if (other === undefined) continue
    const scaled = q.value * 10 ** (p.exp - (P[other] as Prefix).exp)
    const text = fmt(scaled, 6)
    if (text.replace(/^0\./, '').length <= 7 && !text.includes('e')) {
      forms.push(`${text} ${(P[other] as Prefix).sym}${q.unit.sym}`)
    }
  }
  if (q.unit.sym === 'Ω') {
    if (q.prefix === 'k' || q.prefix === 'M') {
      forms.push(`${v}${q.prefix}`)
      const [whole, dec] = v.split('.')
      if (dec) forms.push(`${whole}${q.prefix}${dec}`)
    }
  }
  const withQualifier = q.qualifier
    ? [
        ...forms.map((f) => `${f}${q.qualifier?.short}`),
        ...forms.map((f) => `${f} ${q.qualifier?.text}`),
        ...forms,
      ]
    : forms
  return unique([quantityDisplay(q), ...withQualifier])
}

function quantityItem(q: Quantity) {
  return { display: quantityDisplay(q), speak: quantitySpeak(q), accepted: quantityAccepted(q) }
}

const eSeries = (rng: Rng, minDecade: number, maxDecade: number) =>
  Number((pick(E12, rng) * 10 ** int(rng, minDecade, maxDecade)).toPrecision(3))

/** Sceglie il prefisso più naturale per un valore espresso nell'unità base. */
function withPrefix(baseValue: number, allowed: string[]): { value: number; prefix: string } {
  for (const prefix of [...allowed].reverse()) {
    const v = baseValue / 10 ** (P[prefix] as Prefix).exp
    if (v >= 1) return { value: Number(v.toPrecision(4)), prefix }
  }
  const prefix = allowed[0] as string
  return { value: Number((baseValue / 10 ** (P[prefix] as Prefix).exp).toPrecision(4)), prefix }
}

const resistance: Generator = (rng) =>
  quantityItem({ ...withPrefix(eSeries(rng, 0, 6), ['', 'k', 'M']), unit: U.ohm })

const capacitance: Generator = (rng) =>
  quantityItem({ ...withPrefix(eSeries(rng, -12, -5), ['p', 'n', 'u']), unit: U.farad })

const voltage: Generator = (rng) => {
  if (rng() < 0.5) {
    const q: Quantity = {
      value: pick([10, 20, 50, 100, 150, 200, 250, 300, 500, 800], rng),
      prefix: 'm',
      unit: U.volt,
    }
    if (rng() < 0.5) q.qualifier = { text: 'peak-to-peak', short: 'pp' }
    return quantityItem(q)
  }
  return quantityItem({
    value: pick([0.8, 1.2, 1.8, 2.5, 3.3, 5, 9, 12, 24, 48, 1.71, 3.6, 5.5], rng),
    prefix: '',
    unit: U.volt,
  })
}

const current: Generator = (rng) =>
  quantityItem(
    pick(
      [
        () => ({
          value: pick([0.5, 1.2, 2, 5, 15, 20, 35, 150, 250], rng),
          prefix: 'u',
          unit: U.amp,
        }),
        () => ({ value: int(rng, 1, 500), prefix: 'm', unit: U.amp }),
        () => ({ value: pick([0.5, 1, 1.5, 2, 3, 5, 10], rng), prefix: '', unit: U.amp }),
      ],
      rng,
    )(),
  )

const frequency: Generator = (rng) =>
  quantityItem(
    pick(
      [
        () => ({ value: pick([50, 60, 100, 440, 500], rng), prefix: '', unit: U.hertz }),
        () => ({
          value: pick([1, 10, 32.768, 100, 125, 400, 455], rng),
          prefix: 'k',
          unit: U.hertz,
        }),
        () => ({
          value: pick([4, 8, 12, 16, 25, 48, 64, 72, 100, 150, 168, 400, 480], rng),
          prefix: 'M',
          unit: U.hertz,
        }),
        () => ({ value: pick([1, 2.4, 5], rng), prefix: 'G', unit: U.hertz }),
      ],
      rng,
    )(),
  )

const timeUnit: Generator = (rng) => {
  const q: Quantity = pick(
    [
      () => ({ value: int(rng, 1, 99), prefix: 'n', unit: U.second }),
      () => ({ value: pick([1, 2.5, 10, 50, 100, 250, 500], rng), prefix: 'u', unit: U.second }),
      () => ({ value: pick([1, 5, 10, 20, 100, 500], rng), prefix: 'm', unit: U.second }),
    ],
    rng,
  )()
  if (q.prefix === 'n' && rng() < 0.5) q.qualifier = { text: 'rise time', short: ' rise time' }
  return quantityItem(q)
}

const power: Generator = (rng) =>
  quantityItem(
    pick(
      [
        () => ({ value: pick([1.5, 5, 10, 50, 200, 500], rng), prefix: 'u', unit: U.watt }),
        () => ({ value: int(rng, 1, 999), prefix: 'm', unit: U.watt }),
        () => ({ value: pick([0.25, 0.5, 1, 2, 5, 10], rng), prefix: '', unit: U.watt }),
      ],
      rng,
    )(),
  )

// ── Livello 6 ────────────────────────────────────────────────────────────────

const tolerance: Generator = (rng) => {
  const tol = pick(['0.1', '0.5', '1', '2', '5', '10', '20'], rng)
  const tolAccepted = [`±${tol}%`, `+/-${tol}%`, `${tol}%`]
  if (rng() < 0.4) {
    return {
      display: `±${tol}%`,
      speak: `plus or minus ${say(tol)} percent`,
      accepted: tolAccepted,
    }
  }
  const q: Quantity =
    rng() < 0.6
      ? { ...withPrefix(eSeries(rng, 1, 5), ['', 'k', 'M']), unit: U.ohm }
      : { ...withPrefix(eSeries(rng, -11, -6), ['p', 'n', 'u']), unit: U.farad }
  const forms = quantityAccepted(q)
  return {
    display: `${quantityDisplay(q)} ±${tol}%`,
    speak: `${quantitySpeak(q)}, plus or minus ${say(tol)} percent`,
    accepted: unique(forms.flatMap((f) => tolAccepted.map((t) => `${f} ${t}`))),
  }
}

type Range = { lo: number; hi: number; unit: 'degc' | Unit; prefix?: string }

/** Intervalli realistici da datasheet: temperatura, alimentazione, frequenza di clock. */
function randomRange(rng: Rng): Range {
  switch (int(rng, 0, 2)) {
    case 0:
      return {
        lo: pick([-55, -40, -40, -25, -20, 0], rng),
        hi: pick([70, 85, 105, 125, 150], rng),
        unit: 'degc',
      }
    case 1:
      return {
        lo: pick([1.62, 1.71, 1.8, 2, 2.7, 3], rng),
        hi: pick([3.6, 3.6, 5.5], rng),
        unit: U.volt,
      }
    default:
      return {
        lo: pick([1, 4, 8], rng),
        hi: pick([16, 24, 26, 32, 48], rng),
        unit: U.hertz,
        prefix: 'M',
      }
  }
}

const range: Generator = (rng) => {
  const r = randomRange(rng)
  const signed = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n))
  const sayN = (n: number, plus: boolean) =>
    n < 0 ? `minus ${say(-n)}` : plus && n > 0 ? `plus ${say(n)}` : say(n)
  if (r.unit === 'degc') {
    const plus = rng() < 0.5
    return {
      display: `${signed(r.lo)} °C to ${signed(r.hi)} °C`,
      speak: `from ${sayN(r.lo, plus)} to ${sayN(r.hi, plus)} degrees Celsius`,
      accepted: [
        `${signed(r.lo)} °C to ${signed(r.hi)} °C`,
        `${fmt(r.lo)} to ${fmt(r.hi)} °C`,
        `${fmt(r.lo)} to ${fmt(r.hi)}`,
      ],
    }
  }
  const p = P[r.prefix ?? ''] as Prefix
  const sym = `${p.sym}${r.unit.sym}`
  const words = `${p.word}${r.unit.plural}`
  return {
    display: `${fmt(r.lo)} ${sym} to ${fmt(r.hi)} ${sym}`,
    speak: `from ${say(r.lo)} to ${say(r.hi)} ${words}`,
    accepted: [
      `${fmt(r.lo)} ${sym} to ${fmt(r.hi)} ${sym}`,
      `${fmt(r.lo)} to ${fmt(r.hi)} ${sym}`,
      `${fmt(r.lo)} to ${fmt(r.hi)}`,
    ],
  }
}

// ── Livello 7 ────────────────────────────────────────────────────────────────

const HEX_LETTERS: Record<string, string> = {
  A: 'ay',
  B: 'bee',
  C: 'see',
  D: 'dee',
  E: 'ee',
  F: 'eff',
}

export function speakHex(hex: string): string {
  return `zero x ${[...hex]
    .map((c) => HEX_LETTERS[c] ?? (c === '0' ? 'zero' : DIGIT_WORDS[Number(c)]))
    .join(' ')}`
}

function randomHex(rng: Rng, length: number): string {
  const styles = [
    () => Array.from({ length }, () => '0123456789ABCDEF'[int(rng, 0, 15)]).join(''),
    () => `${'0123456789ABCDEF'[int(rng, 1, 15)]}${'0'.repeat(length - 1)}`,
    () =>
      `${'0123456789ABCDEF'[int(rng, 1, 15)]}${'0123456789ABCDEF'[int(rng, 0, 15)]}`.padEnd(
        length,
        '0',
      ),
  ]
  return pick(styles, rng)()
}

const hex: Generator = (rng) => {
  const value = randomHex(rng, pick([2, 4, 4, 8], rng))
  return { display: `0x${value}`, speak: speakHex(value), accepted: [`0x${value}`] }
}

const bit: Generator = (rng) => {
  if (rng() < 0.5) {
    const b = int(rng, 0, 31)
    return {
      display: `bit ${b}`,
      speak: `bit ${integerToWords(b)}`,
      accepted: [`bit ${b}`, String(b)],
    }
  }
  const hi = pick([7, 15, 23, 31], rng)
  const lo = hi - pick([3, 7], rng)
  return {
    display: `bits [${hi}:${lo}]`,
    speak: `bits ${integerToWords(hi)} to ${integerToWords(lo)}`,
    accepted: [
      `bits [${hi}:${lo}]`,
      `bits ${hi} to ${lo}`,
      `${hi}:${lo}`,
      `${hi} to ${lo}`,
      `[${hi}:${lo}]`,
    ],
  }
}

const register: Generator = (rng) => {
  const offset = (int(rng, 0, 63) * 4).toString(16).toUpperCase().padStart(2, '0')
  const label = pick(['register offset', 'offset', 'address offset'], rng)
  return {
    display: `${label} 0x${offset}`,
    speak: `${label} ${speakHex(offset)}`,
    accepted: [`0x${offset}`, `${label} 0x${offset}`],
    hint: 'Basta l’indirizzo, es. 0x1C',
  }
}

export const GENERATORS: Record<string, Generator> = {
  small,
  tens,
  'teen-ty': teenTy,
  big,
  ordinal,
  year,
  date,
  time,
  decimal,
  negative,
  percent,
  price,
  phone,
  code,
  resistance,
  capacitance,
  voltage,
  current,
  frequency,
  'time-unit': timeUnit,
  power,
  tolerance,
  range,
  hex,
  bit,
  register,
}

export function generateNumberItem(level: number, kind: string, rng: Rng): NumberItem {
  const generator = GENERATORS[kind]
  if (!generator) throw new Error(`Tipo di numero sconosciuto: ${kind}`)
  const item = generator(rng)
  return { level, kind, ...item, accepted: unique(item.accepted) }
}
