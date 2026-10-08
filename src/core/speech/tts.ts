import type { Accent } from '../db/settings'

/** Intervallo della velocità scelta nelle impostazioni. */
export const MIN_RATE = 0.6
export const MAX_RATE = 1.2
/** Gli esercizi di velocità crescente possono andare oltre l'impostazione. */
const SPEECH_RATE_LIMITS = [0.5, 1.6] as const

export type SpeakOptions = {
  accent?: Accent
  rate?: number
  voiceURI?: string | null
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function clampRate(
  rate: number,
  [min, max]: readonly [number, number] = [MIN_RATE, MAX_RATE],
): number {
  return Math.min(max, Math.max(min, rate))
}

/** Android a volte usa "en_US" invece di "en-US". */
function langOf(voice: SpeechSynthesisVoice): string {
  return voice.lang.replace('_', '-')
}

/**
 * Le voci si caricano in modo asincrono (Chrome le annuncia con "voiceschanged"):
 * aspetta che arrivino, al massimo `timeoutMs`.
 */
export function loadVoices(
  synth: SpeechSynthesis | null = isTtsSupported() ? window.speechSynthesis : null,
  timeoutMs = 2000,
): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([])
  const now = synth.getVoices()
  if (now.length > 0) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      synth.removeEventListener('voiceschanged', done)
      resolve(synth.getVoices())
    }
    const timer = setTimeout(done, timeoutMs)
    synth.addEventListener('voiceschanged', done)
  })
}

export function englishVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => /^en-(US|GB)$/i.test(langOf(v)))
}

/**
 * Sceglie la voce: quella salvata se esiste ancora, altrimenti la migliore per l'accento.
 * Le voci locali hanno la precedenza perché funzionano offline.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  accent: Accent,
  voiceURI?: string | null,
): SpeechSynthesisVoice | undefined {
  if (voiceURI) {
    const chosen = voices.find((v) => v.voiceURI === voiceURI)
    if (chosen) return chosen
  }
  const score = (v: SpeechSynthesisVoice) =>
    (langOf(v).toLowerCase() === accent.toLowerCase() ? 4 : 0) +
    (v.localService ? 2 : 0) +
    (v.default ? 1 : 0)
  return englishVoices(voices).sort((a, b) => score(b) - score(a))[0]
}

type QueueEntry = {
  text: string
  options: SpeakOptions
  resolve: (completed: boolean) => void
  /** Riferimento tenuto vivo: Chrome perde l'evento "end" se l'utterance viene raccolta dal GC. */
  utterance?: SpeechSynthesisUtterance
}

/**
 * Coda di frasi da leggere una dopo l'altra.
 * Ogni `enqueue` restituisce una promise che si risolve con `true` a fine lettura,
 * o con `false` se la frase è stata annullata.
 */
export class TtsQueue {
  private queue: QueueEntry[] = []
  private currentEntry: QueueEntry | null = null
  private voices: SpeechSynthesisVoice[] = []
  /** L'attesa delle voci si fa una volta sola: alcuni browser non ne annunciano mai. */
  private voicesRequested = false
  private idleListeners = new Set<() => void>()

  constructor(
    private readonly synth: SpeechSynthesis | null = isTtsSupported()
      ? window.speechSynthesis
      : null,
  ) {}

  get speaking(): boolean {
    return this.currentEntry !== null
  }

  /** Avvisa quando la coda si svuota. Restituisce la funzione per smettere di ascoltare. */
  onIdle(listener: () => void): () => void {
    this.idleListeners.add(listener)
    return () => this.idleListeners.delete(listener)
  }

  enqueue(text: string, options: SpeakOptions = {}): Promise<boolean> {
    if (!this.synth || !text.trim()) return Promise.resolve(false)
    return new Promise((resolve) => {
      this.queue.push({ text, options, resolve })
      if (!this.currentEntry) void this.playNext()
    })
  }

  /** Annulla la frase in corso e quelle in attesa, poi legge le nuove. */
  speak(texts: string | readonly string[], options: SpeakOptions = {}): Promise<boolean> {
    this.cancel()
    const list = typeof texts === 'string' ? [texts] : texts
    const promises = list.map((t) => this.enqueue(t, options))
    return Promise.all(promises).then((all) => all.length > 0 && all.every(Boolean))
  }

  cancel(): void {
    const pending = this.queue
    this.queue = []
    pending.forEach((e) => e.resolve(false))
    if (this.currentEntry) {
      const entry = this.currentEntry
      this.currentEntry = null
      entry.resolve(false)
    }
    this.synth?.cancel()
  }

  private async playNext(): Promise<void> {
    const entry = this.queue.shift()
    if (!entry || !this.synth) {
      this.idleListeners.forEach((l) => l())
      return
    }
    this.currentEntry = entry
    if (!this.voicesRequested) {
      this.voicesRequested = true
      this.voices = await loadVoices(this.synth)
      this.synth.addEventListener?.('voiceschanged', () => {
        this.voices = this.synth?.getVoices() ?? []
      })
    }
    // Annullata mentre si caricavano le voci.
    if (this.currentEntry !== entry) return

    const accent = entry.options.accent ?? 'en-US'
    const utterance = new SpeechSynthesisUtterance(entry.text)
    utterance.lang = accent
    utterance.rate = clampRate(entry.options.rate ?? 1, SPEECH_RATE_LIMITS)
    const voice = pickVoice(this.voices, accent, entry.options.voiceURI)
    if (voice) utterance.voice = voice

    const settle = (completed: boolean) => {
      if (this.currentEntry !== entry) return
      this.currentEntry = null
      entry.resolve(completed)
      void this.playNext()
    }
    utterance.onend = () => settle(true)
    utterance.onerror = () => settle(false)
    entry.utterance = utterance
    this.synth.speak(utterance)
  }
}

/** Coda condivisa da tutta l'app: una sola voce alla volta. */
export const tts = new TtsQueue()
