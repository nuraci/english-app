import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from '../db/settings'
import { listen, SttError, type SttErrorCode, type SttResult } from './stt'
import { tts } from './tts'

/** Legge testo con le impostazioni di voce dell'utente. */
export function useSpeaker() {
  const settings = useSettings()
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => tts.onIdle(() => setSpeaking(false)), [])
  useEffect(() => () => tts.cancel(), [])

  const speak = useCallback(
    (text: string | readonly string[], rateFactor = 1) => {
      setSpeaking(true)
      return tts
        .speak(text, {
          accent: settings.accent,
          rate: settings.rate * rateFactor,
          voiceURI: settings.voiceURI,
        })
        .finally(() => setSpeaking(tts.speaking))
    },
    [settings.accent, settings.rate, settings.voiceURI],
  )

  const stop = useCallback(() => tts.cancel(), [])

  return { speak, stop, speaking }
}

/** Ascolta una frase; gestisce stato, testo parziale ed errori. */
export function useListener() {
  const settings = useSettings()
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<SttErrorCode | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const start = useCallback(async (): Promise<SttResult | null> => {
    controller.current?.abort()
    const ctrl = new AbortController()
    controller.current = ctrl
    tts.cancel()
    setError(null)
    setInterim('')
    setListening(true)
    try {
      return await listen({ lang: settings.accent, onInterim: setInterim, signal: ctrl.signal })
    } catch (e) {
      const code = e instanceof SttError ? e.code : 'unknown'
      if (code !== 'aborted') setError(code)
      return null
    } finally {
      if (controller.current === ctrl) setListening(false)
    }
  }, [settings.accent])

  const cancel = useCallback(() => controller.current?.abort(), [])

  return { start, cancel, listening, interim, error }
}
