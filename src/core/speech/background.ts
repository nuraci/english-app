/**
 * Riproduzione a mani libere con lo schermo spento:
 * - un audio silenzioso in loop fa risultare la pagina "in riproduzione", così il browser non la congela;
 * - Media Session mostra i comandi sulla schermata di blocco e nelle notifiche;
 * - Wake Lock (facoltativo) tiene lo schermo acceso per chi preferisce.
 */

/** WAV di un secondo di silenzio (8 kHz, 8 bit, mono). */
export function silentWav(seconds = 1): Blob {
  const rate = 8000
  const samples = rate * seconds
  const buffer = new ArrayBuffer(44 + samples)
  const view = new DataView(buffer)
  const write = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  write(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate, true)
  view.setUint16(32, 1, true)
  view.setUint16(34, 8, true)
  write(36, 'data')
  view.setUint32(40, samples, true)
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128) // 128 = silenzio in PCM a 8 bit
  return new Blob([buffer], { type: 'audio/wav' })
}

export type BackgroundSession = {
  setTitle: (title: string) => void
  stop: () => void
}

export type BackgroundHandlers = {
  onStop: () => void
  onNext?: () => void
  onPrevious?: () => void
}

/** Da chiamare dentro un gesto dell'utente (tocco su "Avvia"): i browser mobili lo richiedono. */
export async function startBackgroundSession(
  title: string,
  handlers: BackgroundHandlers,
): Promise<BackgroundSession> {
  const url = URL.createObjectURL(silentWav())
  const audio = new Audio(url)
  audio.loop = true
  try {
    await audio.play()
  } catch {
    // Senza autoplay va avanti lo stesso: la lettura funziona, solo senza comandi sulla schermata di blocco.
  }

  const session = 'mediaSession' in navigator ? navigator.mediaSession : null
  const setTitle = (text: string) => {
    if (!session || typeof MediaMetadata === 'undefined') return
    session.metadata = new MediaMetadata({ title: text, artist: 'TechTalk Coach', album: title })
  }
  if (session) {
    setTitle(title)
    session.playbackState = 'playing'
    const actions: [MediaSessionAction, (() => void) | undefined][] = [
      ['pause', handlers.onStop],
      ['stop', handlers.onStop],
      ['nexttrack', handlers.onNext],
      ['previoustrack', handlers.onPrevious],
    ]
    for (const [action, handler] of actions) {
      try {
        session.setActionHandler(action, handler ?? null)
      } catch {
        // Azione non supportata da questo browser.
      }
    }
  }

  return {
    setTitle,
    stop: () => {
      audio.pause()
      URL.revokeObjectURL(url)
      if (session) {
        session.playbackState = 'none'
        for (const action of [
          'pause',
          'stop',
          'nexttrack',
          'previoustrack',
        ] as MediaSessionAction[]) {
          try {
            session.setActionHandler(action, null)
          } catch {
            // ignorato
          }
        }
      }
    },
  }
}

export type WakeLockHandle = { release: () => Promise<void> }

/** Tiene lo schermo acceso; restituisce null se il browser non lo permette. */
export async function keepScreenOn(): Promise<WakeLockHandle | null> {
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockHandle> }
    }
    return (await nav.wakeLock?.request('screen')) ?? null
  } catch {
    return null
  }
}
