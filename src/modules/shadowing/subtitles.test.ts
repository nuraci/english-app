import { describe, expect, it } from 'vitest'
import { cleanCueText, parseSubtitles, parseTimestamp, shadowingLines } from './subtitles'

const SRT = `\uFEFF1\r
00:00:01,000 --> 00:00:03,500\r
Hello, IT. Have you tried turning it off and on again?\r
\r
2\r
00:00:04,000 --> 00:00:06,000\r
<i>- Are you sure it's plugged in?</i>\r
- Yes.\r
\r
3\r
00:00:06,500 --> 00:00:08,000\r
♪ ♪\r
\r
4\r
00:00:08,500 --> 00:00:10,000\r
[PHONE RINGING]\r
\r
5\r
00:00:10,500 --> 00:00:12,000\r
{\\an8}ROY: I'll just put this over here with the rest of the fire.\r
\r
6\r
00:00:12,500 --> 00:00:13,000\r
Yes.\r
`

const VTT = `WEBVTT

00:01.000 --> 00:03.000
The board ran for forty-eight hours.

intro
00:00:04.000 --> 00:00:05.500
We found a bug in the ADC.
`

describe('sottotitoli', () => {
  it('legge un file SRT e pulisce le battute', () => {
    const cues = parseSubtitles(SRT)
    expect(cues.map((c) => c.text)).toEqual([
      'Hello, IT. Have you tried turning it off and on again?',
      "Are you sure it's plugged in? Yes.",
      "I'll just put this over here with the rest of the fire.",
      'Yes.',
    ])
    expect(cues[0]).toMatchObject({ start: 1000, end: 3500 })
  })

  it('legge anche WebVTT', () => {
    expect(parseSubtitles(VTT).map((c) => c.text)).toEqual([
      'The board ran for forty-eight hours.',
      'We found a bug in the ADC.',
    ])
    expect(parseSubtitles(VTT)[1]?.start).toBe(4000)
  })

  it('per lo shadowing scarta doppioni e battute di una parola', () => {
    const lines = shadowingLines(
      parseSubtitles(
        SRT +
          '\n\n7\n00:00:14,000 --> 00:00:15,000\nhello, it. have you tried turning it off and on again?\n',
      ),
    )
    expect(lines).toHaveLength(3)
    expect(lines).not.toContain('Yes.')
  })

  it('timestamp e pulizia', () => {
    expect(parseTimestamp('01:02:03,004')).toBe(3723004)
    expect(parseTimestamp('02:03.5')).toBe(123500)
    expect(parseTimestamp('boh')).toBeNaN()
    expect(cleanCueText('<font color="red">Moss</font> (LAUGHS) is here')).toBe('Moss is here')
  })

  it('un file senza battute valide restituisce una lista vuota', () => {
    expect(parseSubtitles('just some text\nwithout timestamps')).toEqual([])
  })
})
