import { numberStringToWords } from './numberToWords'

/** Simboli che in inglese parlato si leggono come parole. L'ordine conta: prima i più lunghi. */
const SYMBOLS: [RegExp, string][] = [
  [/±|\+\/-/g, ' plus or minus '],
  [/[Ωω]/g, ' ohm '],
  [/[µμ]/g, ' micro '],
  [/°\s*c\b/gi, ' degrees celsius '],
  [/°\s*f\b/gi, ' degrees fahrenheit '],
  [/°/g, ' degrees '],
  [/%/g, ' percent '],
  [/&/g, ' and '],
  [/@/g, ' at '],
]

/** Forme equivalenti ridotte a una sola: la desinenza plurale delle unità non deve contare. */
const CANONICAL_WORDS: Record<string, string> = {
  ohms: 'ohm',
  degree: 'degrees',
  okay: 'ok',
}

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'cannot'],
  [/\bcan not\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  // Sulla tastiera del telefono l'apostrofo si salta spesso: "didnt" = "didn't".
  [/\b(do|does|did|is|are|was|were|has|have|had|could|should|would|must)nt\b/g, '$1 not'],
  [/\bcant\b/g, 'cannot'],
  [/\bwont\b/g, 'will not'],
  [/\bim\b/g, 'i am'],
  [/\b(i|you|we|they)'re\b/g, '$1 are'],
  [/\bi'm\b/g, 'i am'],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, '$1 will'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'],
  [/\b(i|you|we|they|he|she)'d\b/g, '$1 would'],
  [/\blet's\b/g, 'let us'],
]

function numbersToWords(text: string): string {
  return (
    text
      // Separatori delle migliaia: 1,000,000 → 1000000
      .replace(/\b\d{1,3}(?:,\d{3})+\b/g, (m) => m.replace(/,/g, ''))
      .replace(/(^|[^\w.])([-+]?\d+(?:\.\d+)?)(?![\w.]*\d)/g, (_, before: string, num: string) => {
        return `${before} ${numberStringToWords(num)} `
      })
  )
}

/**
 * Riduce una risposta a una forma canonica per il confronto:
 * minuscole, apostrofi uniformi, contrazioni espanse, simboli e cifre in parole,
 * niente punteggiatura, spazi singoli. "Forty-seven Ω!" → "forty seven ohm".
 */
export function normalize(input: string): string {
  let text = input.normalize('NFKC').toLowerCase()
  text = text.replace(/[‘’ʼ`´]/g, "'").replace(/[“”]/g, '"')
  for (const [re, rep] of CONTRACTIONS) text = text.replace(re, rep)
  for (const [re, rep] of SYMBOLS) text = text.replace(re, rep)
  text = numbersToWords(text)
  // "one hundred and five" (UK) = "one hundred five" (US)
  text = text.replace(/\b(hundred|thousand|million|billion)\s+and\b/g, '$1')
  text = text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => CANONICAL_WORDS[w] ?? w)
    .join(' ')
  return text
}
