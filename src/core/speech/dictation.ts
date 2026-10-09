import type { Accent } from '../db/settings'
import { getOnDeviceStatus, getRecognitionCtor, SttError, type SttErrorCode } from './stt'

export type DictationOptions = {
  lang?: Accent
  /** Testo aggiornato a ogni risultato: frasi confermate + parte provvisoria. */
  onText?: (text: string) => void
  onError?: (code: SttErrorCode) => void
}

export type Dictation = {
  /** Ferma l'ascolto e restituisce la trascrizione completa. */
  stop: () => Promise<string>
  cancel: () => void
}

const ERROR_CODES: Record<string, SttErrorCode> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'audio-capture': 'audio-capture',
  network: 'network',
  'language-not-supported': 'language-not-supported',
}

/**
 * Dettatura lunga (risposte da uno o due minuti). Su Android il riconoscimento si chiude
 * dopo una pausa anche in modalità continua: qui riparte da solo finché non si chiama stop().
 */
export async function startDictation(options: DictationOptions = {}): Promise<Dictation> {
  const Ctor = getRecognitionCtor()
  if (!Ctor) throw new SttError('not-supported')
  const lang = options.lang ?? 'en-US'
  const local = (await getOnDeviceStatus(lang)) === 'available'
  if (!local && typeof navigator !== 'undefined' && !navigator.onLine) throw new SttError('offline')

  const finals: string[] = []
  let interim = ''
  let active = true
  let current: InstanceType<typeof Ctor> | null = null
  let resolveStop: ((text: string) => void) | null = null

  const fullText = () =>
    [...finals, interim]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ')

  const run = () => {
    const r = new Ctor()
    current = r
    r.lang = lang
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1
    if (local) r.processLocally = true
    r.onresult = (event) => {
      interim = ''
      for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result?.[0]?.transcript ?? ''
        if (result?.isFinal) finals.push(text)
        else interim += text
      }
      options.onText?.(fullText())
    }
    r.onerror = (event) => {
      const code = ERROR_CODES[event.error]
      // Silenzio o interruzioni brevi: si riparte. Gli errori veri fermano la dettatura.
      if (code) {
        active = false
        options.onError?.(code)
      }
    }
    r.onend = () => {
      if (interim) {
        finals.push(interim)
        interim = ''
      }
      if (active) {
        try {
          run()
          return
        } catch {
          active = false
        }
      }
      current = null
      resolveStop?.(fullText())
    }
    r.start()
  }

  run()

  return {
    stop: () =>
      new Promise<string>((resolve) => {
        active = false
        if (!current) return resolve(fullText())
        resolveStop = resolve
        current.stop()
      }),
    cancel: () => {
      active = false
      current?.abort()
    },
  }
}
