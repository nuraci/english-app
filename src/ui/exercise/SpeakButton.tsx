import { useEffect } from 'react'
import { isTtsSupported, useSpeaker } from '../../core/speech'
import { Button } from '../Button'
import { Icon } from '../Icon'

type Props = {
  text: string
  /** Moltiplicatore della velocità rispetto alle impostazioni. */
  rate?: number
  /** Legge subito il testo, appena il tasto compare. */
  autoplay?: boolean
}

/** Ascolta la frase; il secondo tasto la ripete più lentamente. */
export function SpeakButton({ text, rate = 1, autoplay = false }: Props) {
  const { speak, stop, speaking } = useSpeaker()

  useEffect(() => {
    if (autoplay) void speak(text, rate)
    // Solo alla comparsa: le impostazioni che cambiano non devono far ripartire la lettura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, text])

  if (!isTtsSupported()) return null
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        className="flex flex-1 items-center justify-center gap-2"
        onClick={() => (speaking ? stop() : void speak(text, rate))}
      >
        <Icon name={speaking ? 'stop' : 'speaker'} className="size-5" />
        {speaking ? 'Stop' : autoplay ? 'Riascolta' : 'Ascolta'}
      </Button>
      <Button
        variant="secondary"
        onClick={() => void speak(text, rate * 0.75)}
        aria-label="Ascolta più lentamente"
      >
        🐢
      </Button>
    </div>
  )
}
