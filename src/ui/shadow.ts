export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Tempo per ripetere una frase: circa quello che serve per dirla, più un secondo. */
export function repeatPauseMs(sentence: string): number {
  return 1000 + sentence.split(/\s+/).length * 450
}
