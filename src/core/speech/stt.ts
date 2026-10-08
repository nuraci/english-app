import type { Accent } from '../db/settings'

/** Sottoinsieme di SpeechRecognition usato dall'app (TypeScript non lo include ancora nel DOM). */
export interface Recognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  processLocally?: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable'
type AvailabilityOptions = { langs: string[]; processLocally?: boolean }

export interface RecognitionConstructor {
  new (): Recognition
  available?: (options: AvailabilityOptions) => Promise<Availability>
  install?: (options: AvailabilityOptions) => Promise<boolean>
}

export type SttErrorCode =
  | 'not-supported'
  | 'not-allowed'
  | 'no-speech'
  | 'audio-capture'
  | 'network'
  | 'offline'
  | 'language-not-supported'
  | 'aborted'
  | 'unknown'

export class SttError extends Error {
  constructor(public readonly code: SttErrorCode) {
    super(`Riconoscimento vocale: ${code}`)
    this.name = 'SttError'
  }
}

export type SttResult = {
  /** Trascrizioni alternative, dalla più probabile. */
  transcripts: string[]
  confidence: number
}

export type ListenOptions = {
  lang?: Accent
  maxAlternatives?: number
  /** Testo parziale mentre l'utente parla. */
  onInterim?: (text: string) => void
  signal?: AbortSignal
}

export function getRecognitionCtor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function isSttSupported(): boolean {
  return getRecognitionCtor() !== undefined
}

export type OnDeviceStatus = Availability | 'unsupported'

/**
 * Riconoscimento sul dispositivo (funziona offline). Il browser lo supporta se espone
 * SpeechRecognition.available(); il pacchetto lingua può essere da scaricare.
 */
export async function getOnDeviceStatus(lang: Accent = 'en-US'): Promise<OnDeviceStatus> {
  const Ctor = getRecognitionCtor()
  if (!Ctor?.available) return 'unsupported'
  try {
    return await Ctor.available({ langs: [lang], processLocally: true })
  } catch {
    return 'unsupported'
  }
}

/** Scarica il pacchetto lingua per il riconoscimento offline. */
export async function installOnDevice(lang: Accent = 'en-US'): Promise<boolean> {
  const Ctor = getRecognitionCtor()
  if (!Ctor?.install) return false
  try {
    return await Ctor.install({ langs: [lang], processLocally: true })
  } catch {
    return false
  }
}

const ERROR_CODES: Record<string, SttErrorCode> = {
  'not-allowed': 'not-allowed',
  'service-not-allowed': 'not-allowed',
  'no-speech': 'no-speech',
  'audio-capture': 'audio-capture',
  network: 'network',
  'language-not-supported': 'language-not-supported',
  aborted: 'aborted',
}

/**
 * Ascolta una frase e restituisce le trascrizioni.
 * Usa il riconoscimento sul dispositivo se il pacchetto lingua c'è, altrimenti quello del browser
 * (che su Chrome passa da un server e quindi richiede la rete).
 */
export async function listen(options: ListenOptions = {}): Promise<SttResult> {
  const Ctor = getRecognitionCtor()
  if (!Ctor) throw new SttError('not-supported')
  const lang = options.lang ?? 'en-US'
  const local = (await getOnDeviceStatus(lang)) === 'available'
  if (!local && typeof navigator !== 'undefined' && !navigator.onLine) throw new SttError('offline')
  if (options.signal?.aborted) throw new SttError('aborted')

  const recognition = new Ctor()
  recognition.lang = lang
  recognition.continuous = false
  recognition.interimResults = Boolean(options.onInterim)
  recognition.maxAlternatives = options.maxAlternatives ?? 5
  if (local) recognition.processLocally = true

  return new Promise<SttResult>((resolve, reject) => {
    let result: SttResult | null = null
    let error: SttError | null = null

    const onAbort = () => recognition.abort()
    options.signal?.addEventListener('abort', onAbort, { once: true })

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      if (!last) return
      const alternatives = Array.from({ length: last.length }, (_, i) => last[i]).filter(
        (a): a is SpeechRecognitionAlternative => Boolean(a),
      )
      if (last.isFinal) {
        result = {
          transcripts: alternatives.map((a) => a.transcript.trim()).filter(Boolean),
          confidence: alternatives[0]?.confidence ?? 0,
        }
      } else {
        options.onInterim?.(alternatives[0]?.transcript ?? '')
      }
    }
    recognition.onerror = (event) => {
      error = new SttError(ERROR_CODES[event.error] ?? 'unknown')
    }
    recognition.onend = () => {
      options.signal?.removeEventListener('abort', onAbort)
      if (result && result.transcripts.length > 0) resolve(result)
      else if (options.signal?.aborted) reject(new SttError('aborted'))
      else reject(error ?? new SttError('no-speech'))
    }

    try {
      recognition.start()
    } catch {
      options.signal?.removeEventListener('abort', onAbort)
      reject(new SttError('unknown'))
    }
  })
}

/** Messaggio in italiano, gentile e con un suggerimento pratico. */
export function sttErrorMessage(code: SttErrorCode): string {
  switch (code) {
    case 'not-supported':
      return 'Questo browser non riconosce la voce: puoi scrivere la risposta.'
    case 'not-allowed':
      return 'Serve il permesso per il microfono: attivalo dalle impostazioni del browser.'
    case 'no-speech':
      return 'Non ho sentito niente. Riprova parlando un po’ più vicino al telefono.'
    case 'audio-capture':
      return 'Non riesco a usare il microfono. Forse lo sta usando un’altra app?'
    case 'network':
    case 'offline':
      return 'Senza rete il riconoscimento vocale non funziona: per ora scrivi la risposta.'
    case 'language-not-supported':
      return 'La lingua inglese non è disponibile per il riconoscimento su questo telefono.'
    case 'aborted':
      return 'Ascolto interrotto.'
    case 'unknown':
      return 'Qualcosa non è andato con il microfono. Riprova o scrivi la risposta.'
  }
}
