import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clampRate, listen, pickVoice, SttError, TtsQueue } from '.'
import type { Recognition } from './stt'

const voice = (lang: string, extra: Partial<SpeechSynthesisVoice> = {}) =>
  ({
    lang,
    name: lang,
    voiceURI: `${lang}-${extra.localService ? 'local' : 'net'}`,
    localService: false,
    default: false,
    ...extra,
  }) as SpeechSynthesisVoice

describe('pickVoice', () => {
  const voices = [
    voice('it-IT', { localService: true }),
    voice('en-GB'),
    voice('en-US'),
    voice('en_US', { localService: true }),
  ]

  it('preferisce l’accento giusto e le voci locali (offline)', () => {
    expect(pickVoice(voices, 'en-US')?.voiceURI).toBe('en_US-local')
    expect(pickVoice(voices, 'en-GB')?.lang).toBe('en-GB')
  })

  it('usa la voce salvata se esiste ancora', () => {
    expect(pickVoice(voices, 'en-US', 'en-GB-net')?.lang).toBe('en-GB')
    expect(pickVoice(voices, 'en-US', 'sparita')?.voiceURI).toBe('en_US-local')
  })

  it('non sceglie mai voci non inglesi', () => {
    expect(pickVoice([voice('it-IT')], 'en-US')).toBeUndefined()
  })
})

describe('clampRate', () => {
  it('tiene la velocità tra 0.6 e 1.2', () => {
    expect(clampRate(0.1)).toBe(0.6)
    expect(clampRate(0.9)).toBe(0.9)
    expect(clampRate(3)).toBe(1.2)
  })
})

/** speechSynthesis finto: "legge" una frase alla volta, finché il test non chiama finishCurrent. */
class FakeSynth {
  spoken: SpeechSynthesisUtterance[] = []
  current: SpeechSynthesisUtterance | null = null
  getVoices = () => [voice('en-US', { localService: true })]
  addEventListener() {}
  removeEventListener() {}
  speak(u: SpeechSynthesisUtterance) {
    this.spoken.push(u)
    this.current = u
  }
  cancel() {
    const u = this.current
    this.current = null
    u?.onerror?.({ error: 'interrupted' } as SpeechSynthesisErrorEvent)
  }
  finishCurrent() {
    const u = this.current
    this.current = null
    u?.onend?.({} as SpeechSynthesisEvent)
  }
}

class FakeUtterance {
  lang = ''
  rate = 1
  volume = 1
  voice: SpeechSynthesisVoice | null = null
  onend: ((e: unknown) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  constructor(public text: string) {}
}

describe('TtsQueue', () => {
  let synth: FakeSynth
  let queue: TtsQueue

  beforeEach(() => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    synth = new FakeSynth()
    queue = new TtsQueue(synth as unknown as SpeechSynthesis)
  })

  afterEach(() => vi.unstubAllGlobals())

  const flush = () => new Promise((r) => setTimeout(r, 0))

  it('legge le frasi in ordine, una alla volta', async () => {
    const first = queue.enqueue('One', { rate: 3, accent: 'en-US' })
    const second = queue.enqueue('Two')
    await flush()
    expect(synth.spoken.map((u) => u.text)).toEqual(['One'])
    expect(synth.spoken[0]?.rate).toBe(1.6)
    expect(synth.spoken[0]?.voice?.lang).toBe('en-US')

    synth.finishCurrent()
    expect(await first).toBe(true)
    await flush()
    expect(synth.spoken.map((u) => u.text)).toEqual(['One', 'Two'])

    synth.finishCurrent()
    expect(await second).toBe(true)
    expect(queue.speaking).toBe(false)
  })

  it('segnala quando la coda è vuota', async () => {
    const idle = vi.fn()
    queue.onIdle(idle)
    void queue.enqueue('One')
    await flush()
    synth.finishCurrent()
    await flush()
    expect(idle).toHaveBeenCalledTimes(1)
  })

  it('speak annulla le frasi precedenti', async () => {
    const old = queue.enqueue('Old')
    const waiting = queue.enqueue('Waiting')
    await flush()
    const fresh = queue.speak(['New'])
    expect(await old).toBe(false)
    expect(await waiting).toBe(false)
    await flush()
    expect(synth.spoken.at(-1)?.text).toBe('New')
    synth.finishCurrent()
    expect(await fresh).toBe(true)
  })

  it('senza sintesi vocale non fa nulla', async () => {
    expect(await new TtsQueue(null).enqueue('Hi')).toBe(false)
  })
})

/** SpeechRecognition finto: il test decide cosa "sente". */
function installFakeRecognition(script: (r: FakeRecognition) => void, available?: string) {
  class FakeRecognition extends EventTarget implements Recognition {
    lang = ''
    continuous = false
    interimResults = false
    maxAlternatives = 1
    processLocally?: boolean
    onresult: Recognition['onresult'] = null
    onerror: Recognition['onerror'] = null
    onend: Recognition['onend'] = null
    static last: FakeRecognition | undefined
    static available = available ? vi.fn(() => Promise.resolve(available)) : undefined
    start() {
      FakeRecognition.last = this
      queueMicrotask(() => script(this))
    }
    stop() {}
    abort() {
      this.onerror?.({ error: 'aborted' } as SpeechRecognitionErrorEvent)
      this.onend?.()
    }
  }
  vi.stubGlobal('SpeechRecognition', FakeRecognition)
  return FakeRecognition
}

type FakeRecognition = Recognition

function resultEvent(transcripts: string[], isFinal = true) {
  const alts = transcripts.map((transcript, i) => ({ transcript, confidence: 0.9 - i * 0.1 }))
  const result = Object.assign(alts, { isFinal })
  return { results: [result] } as unknown as SpeechRecognitionEvent
}

describe('listen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('senza supporto lancia not-supported', async () => {
    await expect(listen()).rejects.toMatchObject({ code: 'not-supported' })
  })

  it('restituisce le trascrizioni alternative', async () => {
    const onInterim = vi.fn()
    const Fake = installFakeRecognition((r) => {
      r.onresult?.(resultEvent(['I wrote'], false))
      r.onresult?.(resultEvent([' I wrote the firmware ', 'I rode the firmware']))
      r.onend?.()
    })
    const res = await listen({ lang: 'en-GB', onInterim })
    expect(res.transcripts).toEqual(['I wrote the firmware', 'I rode the firmware'])
    expect(res.confidence).toBeCloseTo(0.9)
    expect(onInterim).toHaveBeenCalledWith('I wrote')
    expect(Fake.last).toMatchObject({ lang: 'en-GB', maxAlternatives: 5, interimResults: true })
  })

  it('traduce gli errori del browser', async () => {
    installFakeRecognition((r) => {
      r.onerror?.({ error: 'not-allowed' } as SpeechRecognitionErrorEvent)
      r.onend?.()
    })
    const err = await listen().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SttError)
    expect(err).toMatchObject({ code: 'not-allowed' })
  })

  it('fine senza risultato → no-speech', async () => {
    installFakeRecognition((r) => r.onend?.())
    await expect(listen()).rejects.toMatchObject({ code: 'no-speech' })
  })

  it('offline senza pacchetto locale → offline, senza avviare il microfono', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const Fake = installFakeRecognition(() => {})
    Fake.last = undefined
    await expect(listen()).rejects.toMatchObject({ code: 'offline' })
    expect(Fake.last).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('usa il riconoscimento sul dispositivo se disponibile, anche offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const Fake = installFakeRecognition((r) => {
      r.onresult?.(resultEvent(['ok']))
      r.onend?.()
    }, 'available')
    await expect(listen()).resolves.toMatchObject({ transcripts: ['ok'] })
    expect(Fake.last?.processLocally).toBe(true)
    vi.restoreAllMocks()
  })

  it('si può interrompere con un AbortSignal', async () => {
    installFakeRecognition(() => {})
    const ctrl = new AbortController()
    const p = listen({ signal: ctrl.signal })
    await new Promise((r) => setTimeout(r, 0))
    ctrl.abort()
    await expect(p).rejects.toMatchObject({ code: 'aborted' })
  })
})

describe('TtsQueue: attesa delle voci', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('se il browser non annuncia voci, aspetta una volta sola', async () => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.useFakeTimers()
    const synth = new FakeSynth()
    synth.getVoices = () => []
    const queue = new TtsQueue(synth as unknown as SpeechSynthesis)

    void queue.enqueue('One')
    await vi.advanceTimersByTimeAsync(1999)
    expect(synth.spoken).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(synth.spoken).toHaveLength(1)
    synth.finishCurrent()

    void queue.enqueue('Two')
    await vi.advanceTimersByTimeAsync(0)
    expect(synth.spoken).toHaveLength(2)
    vi.useRealTimers()
  })
})

describe('speakBatch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('consegna subito tutti i segmenti al sistema, con lingua, volume e voce giusti', async () => {
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    const { speakBatch } = await import('.')
    const synth = new FakeSynth()
    synth.getVoices = () => [
      voice('en-GB', { localService: true }),
      voice('it-IT', { localService: true }),
    ]
    const started: number[] = []
    const { done } = await speakBatch(
      [
        { text: 'Hello', item: 0 },
        { text: 'Hello', volume: 0, rate: 0.5, item: 0 },
        { text: 'Ciao', lang: 'it-IT', item: 0 },
      ],
      { accent: 'en-GB', rate: 1, onSegment: (i) => started.push(i) },
      synth as unknown as SpeechSynthesis,
    )
    expect(synth.spoken.map((u) => u.text)).toEqual(['Hello', 'Hello', 'Ciao'])
    const [a, b, c] = synth.spoken as unknown as (FakeUtterance & {
      volume: number
      onstart?: () => void
    })[]
    expect(a?.voice?.lang).toBe('en-GB')
    expect(b?.volume).toBe(0)
    expect(b?.rate).toBe(0.5)
    expect(c?.lang).toBe('it-IT')
    expect(c?.voice?.lang).toBe('it-IT')
    a?.onstart?.()
    c?.onstart?.()
    expect(started).toEqual([0, 2])
    c?.onend?.({})
    expect(await done).toBe(true)
  })
})

describe('silentWav', () => {
  it('produce un WAV valido di silenzio', async () => {
    const { silentWav } = await import('.')
    const blob = silentWav(1)
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBe(44 + 8000)
  })
})
