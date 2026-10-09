import type { BatchSegment } from '../../core/speech'
import type { ShadowItem } from './sources'

export type AutoOptions = {
  /** Quante volte si ascolta ogni frase (con una pausa dopo ciascuna). */
  repetitions: number
  /** Moltiplicatore della pausa per ripetere: 1 = il tempo di dire la frase. */
  pause: number
  /** Legge la traduzione in italiano, se c'è. */
  translation: boolean
}

export const DEFAULT_AUTO: AutoOptions = { repetitions: 2, pause: 1.3, translation: true }

/**
 * Playlist per la modalità auto (a mani libere):
 * frase in inglese → pausa per ripetere → (di nuovo) → traduzione → breve stacco.
 * Le pause sono la frase stessa letta a volume zero: durano quanto serve per ripeterla,
 * e non richiedono timer (che a schermo spento il browser rallenta).
 */
export function buildAutoSegments(
  items: readonly ShadowItem[],
  options: AutoOptions,
): BatchSegment[] {
  const segments: BatchSegment[] = []
  items.forEach((item, index) => {
    for (let r = 0; r < Math.max(1, options.repetitions); r++) {
      segments.push({ text: item.text, item: index })
      segments.push({ text: item.text, volume: 0, rate: 1 / options.pause, item: index })
    }
    if (options.translation && item.translation) {
      segments.push({ text: item.translation, lang: 'it-IT', item: index })
    }
    // Stacco tra una frase e l'altra
    segments.push({ text: 'next', volume: 0, rate: 0.8, item: index })
  })
  return segments
}
