import { useEffect, useRef, useState } from 'react'
import { useSpeaker } from '../core/speech'
import { Button } from './Button'
import { repeatPauseMs, splitSentences } from './shadow'

/**
 * Shadowing frase per frase: la voce legge una frase, poi aspetta che tu la ripeta, e passa alla successiva.
 */
export function ShadowPlayer({ text }: { text: string }) {
  const sentences = splitSentences(text)
  const { speak, stop } = useSpeaker()
  const [current, setCurrent] = useState<number | null>(null)
  const [phase, setPhase] = useState<'listen' | 'repeat'>('listen')
  const running = useRef(false)

  useEffect(
    () => () => {
      running.current = false
    },
    [],
  )

  const run = async () => {
    running.current = true
    for (let i = 0; i < sentences.length && running.current; i++) {
      setCurrent(i)
      setPhase('listen')
      const done = await speak(sentences[i] as string, 0.9)
      if (!done || !running.current) break
      setPhase('repeat')
      await new Promise((r) => setTimeout(r, repeatPauseMs(sentences[i] as string)))
    }
    running.current = false
    setCurrent(null)
  }

  const halt = () => {
    running.current = false
    stop()
    setCurrent(null)
  }

  if (sentences.length === 0) return null
  return (
    <div className="space-y-3">
      <ol lang="en" className="space-y-1">
        {sentences.map((s, i) => (
          <li
            key={i}
            className={`rounded-lg px-2 py-1 ${
              current === i
                ? phase === 'listen'
                  ? 'bg-teal-100 dark:bg-teal-900'
                  : 'bg-amber-100 dark:bg-amber-900/60'
                : ''
            }`}
          >
            {s}
          </li>
        ))}
      </ol>
      {current !== null && (
        <p role="status" className="text-sm font-semibold">
          {phase === 'listen' ? '👂 Ascolta…' : '🗣️ Ora ripeti tu!'}
        </p>
      )}
      <Button
        variant={current === null ? 'primary' : 'secondary'}
        className="w-full"
        onClick={() => (current === null ? void run() : halt())}
      >
        {current === null ? 'Shadowing frase per frase' : 'Ferma'}
      </Button>
    </div>
  )
}
