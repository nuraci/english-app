import type { Evaluation } from './evaluate'

export type FeedbackTone = 'success' | 'almost' | 'retry'

export type FeedbackMessage = {
  tone: FeedbackTone
  title: string
  /** Frase specifica sull'errore, in italiano. */
  detail?: string
}

const SUCCESS_TITLES = ['Perfetto!', 'Ottimo!', 'Esatto!', 'Bravo!', 'Giusto!']

/** Sceglie una variante in modo deterministico, così i test non dipendono dal caso. */
function pick(options: readonly string[], seed: number): string {
  return options[Math.abs(seed) % options.length] ?? options[0] ?? ''
}

function describeDiffs(evaluation: Evaluation, verb = 'era'): string | undefined {
  const [first, ...rest] = evaluation.diffs
  if (!first) return undefined
  const said = evaluation.source === 'speech' ? 'Ho sentito' : 'Hai scritto'
  if (rest.length === 0) return `${said} «${first.got}», ${verb} «${first.expected}».`
  return `Controlla: ${evaluation.diffs.map((d) => `«${d.got}» → «${d.expected}»`).join(', ')}.`
}

/**
 * Messaggio sempre incoraggiante e specifico: mai solo "Sbagliato".
 * Esempio: "Quasi! Hai scritto «thirty», era «thirteen»."
 */
export function buildFeedback(evaluation: Evaluation, seed = 0): FeedbackMessage {
  switch (evaluation.kind) {
    case 'exact':
      return { tone: 'success', title: pick(SUCCESS_TITLES, seed) }
    case 'self':
      return evaluation.correct
        ? { tone: 'success', title: 'Bene, continua così!' }
        : {
            tone: 'retry',
            title: 'Nessun problema, lo ripassiamo presto.',
            detail: `La risposta era «${evaluation.expected}».`,
          }
    case 'typo':
      return {
        tone: 'success',
        title: 'Giusto! Solo un refuso.',
        detail: describeDiffs(evaluation, 'si scrive'),
      }
    case 'close':
      return {
        tone: 'almost',
        title: 'Quasi!',
        detail: describeDiffs(evaluation) ?? `La risposta era «${evaluation.expected}».`,
      }
    case 'wrong':
      return {
        tone: 'retry',
        title: evaluation.given.trim() ? 'Non ancora, ma ci arriverai!' : 'Ecco la risposta.',
        detail: describeDiffs(evaluation) ?? `La risposta era «${evaluation.expected}».`,
      }
  }
}
