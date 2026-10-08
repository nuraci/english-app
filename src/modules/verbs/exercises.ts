import type { Exercise } from '../../core/session'
import { pick, shuffle, type Rng } from '../../core/random'
import {
  exampleForm,
  formsLabel,
  formsOf,
  formsSpeech,
  MODULE,
  sayForm,
  splitExample,
  verbItemId,
  type Verb,
} from './data'

export type VerbExerciseKind = 'flashcard' | 'past' | 'participle' | 'listen' | 'sentence'

const FORM_NAMES = { past: 'Passato', participle: 'Participio passato' } as const

/** Spiegazione comune: le tre forme, il significato e l'eventuale nota. */
function explain(verb: Verb): string {
  return [`${formsLabel(verb)} (${verb.it}).`, verb.note].filter(Boolean).join(' ')
}

/** Risposte accettate: ogni forma valida e, se ce ne sono più di una, anche "was/were". */
function acceptedForms(forms: readonly string[]): string[] {
  return forms.length > 1 ? [...forms, forms.join('/')] : [...forms]
}

function base(verb: Verb, kind: VerbExerciseKind) {
  return {
    id: `${verbItemId(verb)}#${kind}`,
    module: MODULE,
    explanation: explain(verb),
    say: formsSpeech(verb),
  }
}

/** Flashcard: vedi il verbo, prova a ricordare le forme, poi ti valuti. */
export function flashcardExercise(verb: Verb, isNew = false): Exercise {
  return {
    ...base(verb, 'flashcard'),
    prompt: {
      text: `${verb.base} — ${verb.it}`,
      speak: sayForm(verb, 'base'),
      hint: isNew
        ? 'Verbo nuovo! Prova a indovinare passato e participio, poi guarda la risposta.'
        : 'Di’ ad alta voce passato e participio, poi controlla.',
    },
    answer: { accepted: [formsLabel(verb)], mode: 'selfgrade' },
  }
}

/** Scrivi una forma: "Passato di «write» (scrivere)". */
export function formExercise(verb: Verb, form: 'past' | 'participle'): Exercise {
  const forms = formsOf(verb, form)
  return {
    ...base(verb, form),
    prompt: {
      text: `${FORM_NAMES[form]} di «${verb.base}»`,
      hint: forms.length > 1 ? `${verb.it} · ci sono due forme, ne basta una` : verb.it,
      speak: sayForm(verb, 'base'),
    },
    answer: { accepted: acceptedForms(forms), mode: 'type' },
  }
}

/** Completa la frase d'esempio: "I ___ the test firmware. (write)". */
export function sentenceExercise(verb: Verb): Exercise {
  const [before, , after] = splitExample(verb)
  return {
    ...base(verb, 'sentence'),
    prompt: { text: `${before}___${after} (${verb.base})`, hint: verb.example.it },
    answer: { accepted: acceptedForms(formsOf(verb, exampleForm(verb))), mode: 'type' },
  }
}

/**
 * Ascolta e riconosci: la voce dice una forma, scegli quella scritta giusta.
 * Le alternative vengono dallo stesso gruppo quando possibile, perché si somigliano.
 */
export function listenExercise(verb: Verb, allVerbs: readonly Verb[], rng: Rng): Exercise {
  const form = pick(['past', 'participle'] as const, rng)
  const target = formsOf(verb, form)[0] ?? verb.base
  const sameGroup = allVerbs.filter((v) => v.group === verb.group && v.base !== verb.base)
  const others = allVerbs.filter((v) => v.group !== verb.group)
  const pool = [...shuffle(sameGroup, rng), ...shuffle(others, rng)]
  const distractors: string[] = []
  for (const v of pool) {
    const candidate = formsOf(v, form)[0]
    if (candidate && candidate !== target && !distractors.includes(candidate))
      distractors.push(candidate)
    if (distractors.length === 3) break
  }
  return {
    ...base(verb, 'listen'),
    prompt: { text: 'Ascolta: quale forma hai sentito?', speak: sayForm(verb, form) },
    answer: { accepted: [target], mode: 'choice', choices: shuffle([target, ...distractors], rng) },
  }
}

export function buildExercise(
  verb: Verb,
  kind: VerbExerciseKind,
  allVerbs: readonly Verb[],
  rng: Rng,
): Exercise {
  switch (kind) {
    case 'flashcard':
      return flashcardExercise(verb)
    case 'past':
    case 'participle':
      return formExercise(verb, kind)
    case 'sentence':
      return sentenceExercise(verb)
    case 'listen':
      return listenExercise(verb, allVerbs, rng)
  }
}
