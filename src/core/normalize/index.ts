export { normalize } from './normalize'
export { compareAnswer, levenshtein } from './compare'
export type { CompareResult, MatchKind, WordDiff } from './compare'
export {
  integerToWords,
  integerToOrdinalWords,
  numberStringToWords,
  NUMBER_WORDS,
} from './numberToWords'
export {
  classifyNumberError,
  compareNumeric,
  numericKey,
  ordinalSuffix,
  wordsToDigits,
} from './numeric'
export type { NumberErrorTag, NumericCompareResult } from './numeric'
export { alignChars, compareSpelling, spellingKey, spokenToChars } from './spelling'
export type { CharOp, SpellingCompareResult, SpellingOptions } from './spelling'
