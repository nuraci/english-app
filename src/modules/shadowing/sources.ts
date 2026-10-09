import { createRng, shuffle } from '../../core/random'
import { lifesavers, questions, questionsToAsk } from '../interview/data'
import { verbs } from '../verbs/data'
import { decks } from '../vocab/data'

/** Una frase da imitare, con la traduzione se c'è. */
export type ShadowItem = { text: string; translation?: string }

export type ShadowSource = { id: string; name: string; description: string; items: ShadowItem[] }

/** Le frasi d'esempio dei verbi, con la forma al posto delle graffe: "I {wrote} the firmware" → "I wrote the firmware". */
function verbSentences(): ShadowItem[] {
  return verbs.map((v) => ({ text: v.example.en.replace(/[{}]/g, ''), translation: v.example.it }))
}

/** Le sorgenti incluse nell'app: funzionano tutte offline. */
export function builtInSources(seed = Date.now()): ShadowSource[] {
  const rng = createRng(seed)
  return [
    {
      id: 'lifesavers',
      name: 'Frasi salvavita',
      description: 'Le frasi per prendere tempo e chiedere di ripetere al colloquio.',
      items: lifesavers.map((p) => ({ text: p.en, translation: p.it })),
    },
    {
      id: 'ask',
      name: 'Domande da fare',
      description: 'Le domande per il selezionatore, alla fine del colloquio.',
      items: questionsToAsk.map((p) => ({ text: p.en, translation: p.it })),
    },
    {
      id: 'questions',
      name: 'Domande del colloquio',
      description: 'Abitua l’orecchio alle domande che ti faranno.',
      items: questions.map((q) => ({ text: q.text, translation: q.it })),
    },
    {
      id: 'verbs',
      name: 'Frasi con i verbi irregolari',
      description: '20 frasi a caso dal mondo validation: «The board ran for 48 hours».',
      items: shuffle(verbSentences(), rng).slice(0, 20),
    },
    {
      id: 'vocab',
      name: 'Frasi del vocabolario tecnico',
      description: '20 frasi a caso con i termini tecnici.',
      items: shuffle(
        decks.flatMap((d) => d.terms.map((t) => ({ text: t.example, translation: undefined }))),
        rng,
      ).slice(0, 20),
    },
    {
      id: 'samples',
      name: 'Risposte modello',
      description: 'Le risposte modello del colloquio, frase per frase.',
      items: questions
        .filter((q) => q.sample)
        .flatMap((q) => (q.sample ?? '').split(/(?<=[.!?])\s+/).map((text) => ({ text }))),
    },
  ]
}
