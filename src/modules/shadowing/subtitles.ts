export type Cue = { start: number; end: number; text: string }

/** "00:01:02,500" o "01:02.500" → millisecondi. */
export function parseTimestamp(value: string): number {
  const match = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/.exec(value.trim())
  if (!match) return Number.NaN
  const [, h = '0', m = '0', s = '0', ms = '0'] = match
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(ms.padEnd(3, '0'))
}

/** Toglie tag, effetti sonori e simboli: resta solo quello che si dice. */
export function cleanCueText(text: string): string {
  return text
    .replace(/\{\\[^}]*\}/g, '') // {\an8}
    .replace(/<[^>]+>/g, '') // <i>, <font ...>
    .replace(/\[[^\]]*\]|\([A-Z][A-Z\s]+\)/g, '') // [DOOR SLAMS], (LAUGHS)
    .replace(/^[A-Z][A-Z\s]{1,20}:\s*/gm, '') // ROY: …
    .replace(/[♪♫#]/g, '')
    .split('\n')
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Legge un file di sottotitoli SRT o WebVTT e restituisce le battute pulite.
 * Le battute vuote (solo musica o rumori) vengono scartate.
 */
export function parseSubtitles(content: string): Cue[] {
  const text = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const blocks = text.split(/\n{2,}/)
  const cues: Cue[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    const timeIndex = lines.findIndex((l) => l.includes('-->'))
    if (timeIndex < 0) continue
    const [startText = '', endText = ''] = (lines[timeIndex] as string).split('-->')
    const start = parseTimestamp(startText)
    const end = parseTimestamp(endText)
    const spoken = cleanCueText(lines.slice(timeIndex + 1).join('\n'))
    if (!spoken || !/[a-z]/i.test(spoken) || Number.isNaN(start)) continue
    cues.push({ start, end: Number.isNaN(end) ? start : end, text: spoken })
  }
  return cues
}

/** Le battute adatte allo shadowing: niente doppioni e niente frasi di una parola sola. */
export function shadowingLines(cues: readonly Cue[], minWords = 2): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const cue of cues) {
    const key = cue.text.toLowerCase()
    if (cue.text.split(' ').length < minWords || seen.has(key)) continue
    seen.add(key)
    out.push(cue.text)
  }
  return out
}
