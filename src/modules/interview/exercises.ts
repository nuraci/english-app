import type { Exercise } from '../../core/session'
import { MODULE, type Phrase } from './data'

/** Ascolta e ripeti una frase utile, finché non esce da sola. */
export function phraseExercise(
  phrase: Phrase,
  group: 'lifesaver' | 'ask',
  index: number,
): Exercise {
  return {
    id: `${MODULE}:${group}:${index}#repeat`,
    module: MODULE,
    prompt: {
      text: phrase.en,
      speak: phrase.en,
      autoplay: true,
      hint: phrase.when ? `${phrase.it} — ${phrase.when}` : phrase.it,
    },
    answer: {
      accepted: [phrase.en],
      mode: 'speak',
      fallback: 'selfgrade',
      reveal: `${phrase.en}\n${phrase.it}`,
    },
    explanation: phrase.when ? `${phrase.it}. ${phrase.when}` : phrase.it,
    say: phrase.en,
  }
}
