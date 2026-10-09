import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickMimeType, startDictation } from '.'

type Handler = {
  onresult: ((e: unknown) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
}

/** Riconoscimento finto: ogni istanza "sente" la prossima frase dello script e poi si chiude. */
function install(script: string[], error?: string) {
  const instances: (Handler & { stop: () => void })[] = []
  class Fake {
    lang = ''
    continuous = false
    interimResults = false
    maxAlternatives = 1
    onresult: Handler['onresult'] = null
    onerror: Handler['onerror'] = null
    onend: Handler['onend'] = null
    stopped = false
    start() {
      instances.push(this)
      const phrase = script.shift()
      queueMicrotask(() => {
        if (error) {
          this.onerror?.({ error })
          this.onend?.()
          return
        }
        if (phrase) {
          this.onresult?.({
            resultIndex: 0,
            results: [Object.assign([{ transcript: phrase }], { isFinal: false })],
          })
          this.onresult?.({
            resultIndex: 0,
            results: [Object.assign([{ transcript: phrase }], { isFinal: true })],
          })
        }
        // Android chiude dopo una pausa; se lo script è finito resta "aperto" finché non si chiama stop().
        if (script.length > 0 || this.stopped) this.onend?.()
      })
    }
    stop() {
      this.stopped = true
      this.onend?.()
    }
    abort() {
      this.stop()
    }
  }
  vi.stubGlobal('SpeechRecognition', Fake)
  return instances
}

describe('startDictation', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('riparte da solo dopo le pause e accumula tutta la risposta', async () => {
    const instances = install([
      'I am a validation engineer.',
      'I work with oscilloscopes.',
      'I like debugging.',
    ])
    const updates: string[] = []
    const d = await startDictation({ onText: (t) => updates.push(t) })
    await new Promise((r) => setTimeout(r, 10))
    expect(instances.length).toBe(3)
    const text = await d.stop()
    expect(text).toBe('I am a validation engineer. I work with oscilloscopes. I like debugging.')
    expect(updates.at(-1)).toBe(text)
  })

  it('un errore vero (permesso negato) ferma la dettatura e viene segnalato', async () => {
    install(['ignored'], 'not-allowed')
    const onError = vi.fn()
    const d = await startDictation({ onError })
    await new Promise((r) => setTimeout(r, 10))
    expect(onError).toHaveBeenCalledWith('not-allowed')
    expect(await d.stop()).toBe('')
  })

  it('senza supporto lancia not-supported', async () => {
    await expect(startDictation()).rejects.toMatchObject({ code: 'not-supported' })
  })
})

describe('pickMimeType', () => {
  it('sceglie il primo formato audio supportato', () => {
    expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4')
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus')
    expect(pickMimeType(() => false)).toBe('')
  })
})
