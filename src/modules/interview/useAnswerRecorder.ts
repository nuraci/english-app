import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from '../../core/db/settings'
import {
  isRecordingSupported,
  isSttSupported,
  SttError,
  startDictation,
  startRecording,
  tts,
  type Dictation,
  type Recorder,
  type Recording,
  type SttErrorCode,
} from '../../core/speech'

export type AnswerResult = { transcript: string; durationMs: number; recording?: Recording }

/**
 * Registra una risposta lunga: trascrizione (se il riconoscimento c'è) e audio (se il telefono lo
 * permette), più il cronometro. Se una delle due cose non funziona, l'altra va avanti da sola.
 */
export function useAnswerRecorder() {
  const settings = useSettings()
  const [recording, setRecording] = useState(false)
  const [text, setText] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [sttError, setSttError] = useState<SttErrorCode | null>(null)
  const [audioError, setAudioError] = useState(false)
  const dictation = useRef<Dictation | null>(null)
  const recorder = useRef<Recorder | null>(null)
  const startedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }, [])

  useEffect(
    () => () => {
      cleanup()
      dictation.current?.cancel()
      recorder.current?.cancel()
    },
    [cleanup],
  )

  const start = useCallback(async () => {
    tts.cancel()
    setText('')
    setSttError(null)
    setAudioError(false)
    setElapsedMs(0)
    startedAt.current = Date.now()
    setRecording(true)
    timer.current = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250)

    if (isRecordingSupported()) {
      try {
        recorder.current = await startRecording()
      } catch {
        setAudioError(true)
      }
    } else {
      setAudioError(true)
    }
    if (isSttSupported()) {
      try {
        dictation.current = await startDictation({
          lang: settings.accent,
          onText: setText,
          onError: setSttError,
        })
      } catch (e) {
        setSttError(e instanceof SttError ? e.code : 'unknown')
      }
    } else {
      setSttError('not-supported')
    }
  }, [settings.accent])

  const stop = useCallback(async (): Promise<AnswerResult> => {
    cleanup()
    const durationMs = Date.now() - startedAt.current
    const [transcript, audio] = await Promise.all([
      dictation.current?.stop() ?? Promise.resolve(''),
      recorder.current?.stop() ?? Promise.resolve(undefined),
    ])
    dictation.current = null
    recorder.current = null
    setRecording(false)
    setElapsedMs(durationMs)
    return { transcript, durationMs, recording: audio && audio.blob.size > 0 ? audio : undefined }
  }, [cleanup])

  return { start, stop, recording, text, elapsedMs, sttError, audioError }
}
