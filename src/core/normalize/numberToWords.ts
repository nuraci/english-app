const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const
const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion'] as const

const ORDINAL_IRREGULAR: Record<string, string> = {
  one: 'first',
  two: 'second',
  three: 'third',
  five: 'fifth',
  eight: 'eighth',
  nine: 'ninth',
  twelve: 'twelfth',
}

function belowThousand(n: number): string {
  const parts: string[] = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds > 0) parts.push(`${ONES[hundreds]} hundred`)
  if (rest > 0) {
    if (rest < 20) parts.push(ONES[rest] as string)
    else {
      const unit = rest % 10
      parts.push(
        unit ? `${TENS[Math.floor(rest / 10)]}-${ONES[unit]}` : (TENS[rest / 10] as string),
      )
    }
  }
  return parts.join(' ')
}

/** Converte un intero non negativo in parole inglesi (stile US, senza "and"). */
export function integerToWords(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`Numero non supportato: ${n}`)
  if (n === 0) return 'zero'
  const groups: string[] = []
  let scale = 0
  let rest = n
  while (rest > 0) {
    const chunk = rest % 1000
    if (chunk > 0) {
      const scaleWord = SCALES[scale]
      if (scaleWord === undefined) throw new RangeError(`Numero troppo grande: ${n}`)
      groups.unshift(scaleWord ? `${belowThousand(chunk)} ${scaleWord}` : belowThousand(chunk))
    }
    rest = Math.floor(rest / 1000)
    scale++
  }
  return groups.join(' ')
}

/**
 * Converte la scrittura decimale di un numero in parole: "-3.30" → "minus three point three zero".
 * Le cifre dopo la virgola si leggono una per una, come nell'inglese tecnico.
 */
export function numberStringToWords(value: string): string {
  const match = /^([-+]?)(\d+)(?:\.(\d+))?$/.exec(value)
  if (!match) throw new RangeError(`Formato numerico non valido: ${value}`)
  const [, sign, intPart = '', decPart] = match
  const words: string[] = []
  if (sign === '-') words.push('minus')
  if (sign === '+') words.push('plus')
  words.push(integerToWords(Number(intPart)))
  if (decPart) words.push('point', ...[...decPart].map((d) => ONES[Number(d)] as string))
  return words.join(' ')
}

function toOrdinalWord(word: string): string {
  const irregular = ORDINAL_IRREGULAR[word]
  if (irregular) return irregular
  if (word.endsWith('y')) return `${word.slice(0, -1)}ieth`
  return `${word}th`
}

/** Ordinale in parole: 21 → "twenty-first". */
export function integerToOrdinalWords(n: number): string {
  return integerToWords(n).replace(/[a-z]+$/, toOrdinalWord)
}

/** Tutte le parole che compongono numeri: servono a non scambiare "sixty" e "sixth" per un refuso. */
const CARDINAL_WORDS = [...ONES, ...TENS.filter(Boolean), 'hundred', ...SCALES.filter(Boolean)]

export const NUMBER_WORDS: ReadonlySet<string> = new Set([
  ...CARDINAL_WORDS,
  ...CARDINAL_WORDS.map(toOrdinalWord),
  'point',
  'minus',
  'oh',
])
