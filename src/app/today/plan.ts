/**
 * Piano di oggi: 30 minuti in tre blocchi da 10 (lacune · ascolto e shadowing · parlato),
 * con i punti deboli in priorità. Funzione pura: i dati arrivano già calcolati.
 */

export type PlanInput = {
  /** Item SRS scaduti per modulo. */
  due: Record<string, number>
  /** Errori ricorrenti nei numeri (tag), dal più frequente. */
  numbersErrors: string[]
  /** Gruppi di lettere confuse nello spelling, dal più frequente. */
  spellingTraps: string[]
  /** Livello consigliato dei numeri. */
  numbersLevel: number
  /** Mazzo di vocabolario con più termini da ripassare o da scoprire. */
  vocabDeck: { id: string; name: string; due: number }
  /** Sottotitoli importati (id sorgente), se ce ne sono. */
  subtitlesSource?: { id: string; name: string }
  hasMyAnswers: boolean
  /** Moduli con almeno una sessione completata oggi. */
  doneToday: ReadonlySet<string>
  /** Numero del giorno (per alternare le attività da un giorno all'altro). */
  dayNumber: number
}

export type PlanBlock = {
  id: 'gaps' | 'listening' | 'speaking'
  title: string
  minutes: number
  module: string
  activity: string
  reason: string
  to: string
  done: boolean
}

const ERROR_LABELS: Record<string, string> = {
  'teen-ty': '-teen e -ty (13 o 30?)',
  digits: 'cifre scambiate',
  magnitude: 'prefissi e ordini di grandezza',
  decimal: 'virgola decimale',
  sign: 'segno meno',
}

function gapsBlock(input: PlanInput): Omit<PlanBlock, 'done'> {
  const verbs = input.due.verbs ?? 0
  const numbers = (input.due.numbers ?? 0) + input.numbersErrors.length * 5
  const spelling = (input.due.spelling ?? 0) + input.spellingTraps.length * 5
  // A parità di urgenza si alterna, così ogni lacuna viene allenata.
  const candidates = [
    { module: 'verbs', score: verbs },
    { module: 'numbers', score: numbers },
    { module: 'spelling', score: spelling },
  ]
  const rotation = input.dayNumber % 3
  const best = [...candidates].sort(
    (a, b) =>
      b.score - a.score ||
      ((candidates.indexOf(a) - rotation + 3) % 3) - ((candidates.indexOf(b) - rotation + 3) % 3),
  )[0]
  const base = { id: 'gaps' as const, title: 'Lacune', minutes: 10 }
  if (best?.module === 'numbers') {
    const focus = input.numbersErrors[0]
    return focus
      ? {
          ...base,
          module: 'numbers',
          activity: 'Numeri: allenamento mirato',
          reason: `Ripassiamo ${ERROR_LABELS[focus] ?? focus}: è l'errore che torna più spesso.`,
          to: `/allenamenti/numeri/sessione?focus=${focus}`,
        }
      : {
          ...base,
          module: 'numbers',
          activity: `Numeri: livello ${input.numbersLevel}`,
          reason: 'I numeri in ascolto sono una delle tue lacune principali.',
          to: `/allenamenti/numeri/sessione?level=${input.numbersLevel}`,
        }
  }
  if (best?.module === 'spelling') {
    return input.spellingTraps.length
      ? {
          ...base,
          module: 'spelling',
          activity: 'Spelling: alfabeto',
          reason: 'Riprendiamo le lettere che confondi più spesso.',
          to: '/allenamenti/spelling/sessione?mode=alphabet',
        }
      : {
          ...base,
          module: 'spelling',
          activity: 'Spelling: dettato di codici',
          reason: 'Dieci codici dettati lettera per lettera.',
          to: '/allenamenti/spelling/sessione?mode=dictation',
        }
  }
  return {
    ...base,
    module: 'verbs',
    activity: 'Verbi irregolari',
    reason: verbs
      ? `${verbs} verbi da ripassare, più qualche verbo nuovo.`
      : 'Un nuovo gruppo di verbi ti aspetta.',
    to: '/allenamenti/verbi/sessione',
  }
}

function listeningBlock(input: PlanInput, taken: string): Omit<PlanBlock, 'done'> {
  const base = { id: 'listening' as const, title: 'Ascolto e shadowing', minutes: 10 }
  const options: Omit<PlanBlock, 'done'>[] = [
    input.subtitlesSource
      ? {
          ...base,
          module: 'shadowing',
          activity: `Shadowing: ${input.subtitlesSource.name}`,
          reason: 'Le battute del tuo episodio: ascolta e ripeti.',
          to: `/allenamenti/shadowing/player?source=${input.subtitlesSource.id}`,
        }
      : input.hasMyAnswers
        ? {
            ...base,
            module: 'shadowing',
            activity: 'Shadowing: le tue risposte',
            reason: 'Le risposte del colloquio che hai scritto: imitale frase per frase.',
            to: '/allenamenti/shadowing/player?source=my-answers',
          }
        : {
            ...base,
            module: 'shadowing',
            activity: 'Shadowing: frasi salvavita',
            reason: 'Le frasi che ti salvano al colloquio, finché escono da sole.',
            to: '/allenamenti/shadowing/player?source=lifesavers',
          },
    {
      ...base,
      module: 'numbers',
      activity: `Numeri in ascolto: livello ${input.numbersLevel}`,
      reason: 'Allena l’orecchio sui numeri, anche a velocità crescente.',
      to: `/allenamenti/numeri/sessione?level=${input.numbersLevel}&speed=ramp`,
    },
    {
      ...base,
      module: 'spelling',
      activity: 'Dettato di codici',
      reason: 'Part number e sigle dettati: ascolto puro.',
      to: '/allenamenti/spelling/sessione?mode=dictation',
    },
  ]
  const available = options.filter((o) => o.module !== taken)
  return available[input.dayNumber % available.length] as Omit<PlanBlock, 'done'>
}

function speakingBlock(input: PlanInput): Omit<PlanBlock, 'done'> {
  const base = { id: 'speaking' as const, title: 'Parlato', minutes: 10 }
  const options: Omit<PlanBlock, 'done'>[] = [
    {
      ...base,
      module: 'vocab',
      activity: `Vocabolario: ${input.vocabDeck.name}`,
      reason: input.vocabDeck.due
        ? `${input.vocabDeck.due} termini da ripassare: ascolta e ripeti.`
        : 'Termini nuovi da pronunciare bene.',
      to: `/allenamenti/vocabolario/sessione?deck=${input.vocabDeck.id}`,
    },
    {
      ...base,
      module: 'vocab',
      activity: 'Trappole di pronuncia',
      reason: 'Cache, data, silicon, width: le parole che tradiscono gli italiani.',
      to: '/allenamenti/vocabolario/sessione?traps=1',
    },
    {
      ...base,
      module: 'interview',
      activity: 'Frasi salvavita del colloquio',
      reason: 'Ascolta e ripeti le frasi per prendere tempo e chiedere di ripetere.',
      to: '/allenamenti/colloquio/frasi?practice=lifesaver',
    },
  ]
  // I termini scaduti hanno la precedenza; altrimenti si alterna.
  if (input.vocabDeck.due > 0) return options[0] as Omit<PlanBlock, 'done'>
  return options[input.dayNumber % options.length] as Omit<PlanBlock, 'done'>
}

export function buildDailyPlan(input: PlanInput): PlanBlock[] {
  const gaps = gapsBlock(input)
  const listening = listeningBlock(input, gaps.module)
  const speaking = speakingBlock(input)
  return [gaps, listening, speaking].map((b) => ({ ...b, done: input.doneToday.has(b.module) }))
}
