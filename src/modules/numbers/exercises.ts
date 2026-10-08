import type { NumberItem } from '../../content/generators/numbers'
import type { Exercise } from '../../core/session'
import { errorTips, kindTips, MODULE, skillId } from './data'

export type NumberMode = 'listen' | 'read'

const LISTEN_PROMPTS: Record<string, string> = {
  date: 'Ascolta e scrivi la data',
  time: 'Ascolta e scrivi l’ora',
  phone: 'Ascolta e scrivi il numero di telefono',
  tolerance: 'Ascolta e scrivi valore e tolleranza',
  range: 'Ascolta e scrivi l’intervallo',
  hex: 'Ascolta e scrivi il valore esadecimale',
  bit: 'Ascolta e scrivi i bit',
}

const MEASURES = new Set([
  'resistance',
  'capacitance',
  'voltage',
  'current',
  'frequency',
  'time-unit',
  'power',
])

function listenPrompt(kind: string): string {
  if (MEASURES.has(kind)) return 'Ascolta e scrivi la misura, con l’unità'
  return LISTEN_PROMPTS[kind] ?? 'Ascolta e scrivi in cifre'
}

/**
 * Trasforma un numero generato in esercizio.
 * - listen: la voce legge, l'utente scrive (in cifre o come preferisce: il confronto è numerico).
 * - read: l'utente legge ad alta voce il numero scritto; senza microfono si autovaluta.
 */
export function numberExercise(
  item: NumberItem,
  mode: NumberMode,
  index: number,
  rate = 1,
): Exercise {
  const common = {
    id: `${skillId(item.level, item.kind)}#${mode}-${index}`,
    module: MODULE,
    explanation: kindTips[item.kind],
    tips: errorTips,
    say: item.speak,
  }
  if (mode === 'listen') {
    return {
      ...common,
      prompt: {
        text: listenPrompt(item.kind),
        speak: item.speak,
        autoplay: true,
        rate,
        hint: item.hint,
      },
      answer: { accepted: item.accepted, mode: 'type', match: 'number' },
    }
  }
  return {
    ...common,
    prompt: { text: item.display, hint: 'Leggilo ad alta voce in inglese' },
    // La prima risposta è la forma parlata: è quella mostrata nell'autovalutazione.
    answer: {
      accepted: [item.speak, ...item.accepted],
      mode: 'speak',
      match: 'number',
      fallback: 'selfgrade',
    },
  }
}
