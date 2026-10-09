/** Registrazione audio locale con MediaRecorder: l'audio non lascia mai il dispositivo. */

export type Recording = { blob: Blob; mimeType: string; durationMs: number }

export type Recorder = {
  stop: () => Promise<Recording>
  cancel: () => void
}

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

export function isRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

export function pickMimeType(
  isSupported: (type: string) => boolean = (t) => MediaRecorder.isTypeSupported(t),
): string {
  return PREFERRED_TYPES.find((t) => isSupported(t)) ?? ''
}

export async function startRecording(): Promise<Recorder> {
  if (!isRecordingSupported()) throw new Error('Registrazione non supportata')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  const startedAt = Date.now()
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const release = () => stream.getTracks().forEach((t) => t.stop())
  recorder.start(1000)

  return {
    stop: () =>
      new Promise<Recording>((resolve) => {
        recorder.onstop = () => {
          release()
          const type = recorder.mimeType || mimeType || 'audio/webm'
          resolve({
            blob: new Blob(chunks, { type }),
            mimeType: type,
            durationMs: Date.now() - startedAt,
          })
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = release
      if (recorder.state !== 'inactive') recorder.stop()
      else release()
    },
  }
}
