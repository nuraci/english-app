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
