import { useSpeaker } from '../../core/speech'
import { isTtsSupported } from '../../core/speech/tts'
import { Button } from '../Button'
import { Icon } from '../Icon'

/** Ascolta la frase; il secondo tasto la ripete più lentamente. */
export function SpeakButton({ text }: { text: string }) {
  const { speak, stop, speaking } = useSpeaker()
  if (!isTtsSupported()) return null
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        className="flex flex-1 items-center justify-center gap-2"
        onClick={() => (speaking ? stop() : void speak(text))}
      >
        <Icon name={speaking ? 'stop' : 'speaker'} className="size-5" />
        {speaking ? 'Stop' : 'Ascolta'}
      </Button>
      <Button
        variant="secondary"
        onClick={() => void speak(text, 0.75)}
        aria-label="Ascolta più lentamente"
      >
        🐢
      </Button>
    </div>
  )
}
