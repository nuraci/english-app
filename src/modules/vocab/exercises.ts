import { normalize } from '../../core/normalize'
import { shuffle, type Rng } from '../../core/random'
import type { Exercise } from '../../core/session'
import {
  MODULE,
  speechOf,
  termItemId,
  trapItemId,
  type Deck,
  type Term,
  type TrapWord,
} from './data'

export type VocabKind = 'repeat' | 'translate' | 'meaning' | 'definition' | 'explain'

function explanation(term: Term): string {
  return [`${term.en} = ${term.it}.`, term.definition, term.note].filter(Boolean).join(' ')
}

/** Modi accettabili di dire o scrivere il termine: "SMU", "S M U", "peak to peak"... */
function acceptedForms(term: Pick<Term, 'en' | 'say'>): string[] {
  const forms = [term.en, term.en.replace(/[-/]/g, ' ')]
  if (term.say) forms.push(term.say)
  // Sigle: il riconoscimento vocale può restituirle lettera per lettera.
  if (/^[A-Z0-9]{2,6}$/.test(term.en)) forms.push([...term.en].join(' '))
  return [...new Set(forms)]
}

const base = (deck: Deck, term: Term, kind: VocabKind) => ({
  id: `${termItemId(deck, term)}#${kind}`,
  module: MODULE,
  explanation: explanation(term),
  say: speechOf(term),
})

/** Ascolta e ripeti: la pronuncia prima di tutto. */
export function repeatExercise(deck: Deck, term: Term): Exercise {
  return {
    ...base(deck, term, 'repeat'),
    prompt: {
      text: term.en,
      speak: speechOf(term),
      autoplay: true,
      hint: term.note ? `Ascolta e ripeti. ${term.note}` : 'Ascolta e ripeti ad alta voce.',
    },
    answer: {
      accepted: acceptedForms(term),
      mode: 'speak',
      fallback: 'selfgrade',
      reveal: `${term.en} — ${term.it}`,
    },
  }
}

/** La traduzione mostrerebbe già la risposta? ("jitter" → "jitter", "SMU (source measure unit)") */
export function canTranslate(term: Term): boolean {
  const en = normalize(term.en)
  return !normalize(term.it).includes(en)
}

/** Traduci dall'italiano all'inglese, scrivendo. */
export function translateExercise(deck: Deck, term: Term): Exercise {
  return {
    ...base(deck, term, 'translate'),
    prompt: { text: `Come si dice in inglese «${term.it}»?`, hint: deck.name },
    answer: { accepted: acceptedForms(term), mode: 'type' },
  }
}

function distractors<T>(pool: readonly T[], exclude: T, count: number, rng: Rng): T[] {
  return shuffle(
    pool.filter((x) => x !== exclude),
    rng,
  ).slice(0, count)
}

/** Ascolta il termine e scegli il significato in italiano. */
export function meaningExercise(deck: Deck, term: Term, rng: Rng): Exercise {
  const others = distractors(deck.terms, term, 3, rng).map((t) => t.it)
  return {
    ...base(deck, term, 'meaning'),
    prompt: { text: `Che cosa vuol dire «${term.en}»?`, speak: speechOf(term), autoplay: true },
    answer: { accepted: [term.it], mode: 'choice', choices: shuffle([term.it, ...others], rng) },
  }
}

/** Leggi la definizione in inglese semplice e scegli la parola. */
export function definitionExercise(deck: Deck, term: Term, rng: Rng): Exercise {
  const others = distractors(deck.terms, term, 3, rng).map((t) => t.en)
  return {
    ...base(deck, term, 'definition'),
    prompt: { text: term.definition, hint: 'Quale parola corrisponde alla definizione?' },
    answer: { accepted: [term.en], mode: 'choice', choices: shuffle([term.en, ...others], rng) },
  }
}

/** Spiega con parole tue, ad alta voce, poi confronta con la definizione. */
export function explainExercise(deck: Deck, term: Term): Exercise {
  return {
    ...base(deck, term, 'explain'),
    prompt: {
      text: `Explain «${term.en}» in simple English.`,
      hint: 'Parla ad alta voce, anche con frasi semplici. Poi confronta e valutati.',
    },
    answer: {
      accepted: [term.definition],
      mode: 'selfgrade',
      reveal: `${term.definition}\nExample: ${term.example}`,
    },
  }
}

export function buildVocabExercise(deck: Deck, term: Term, kind: VocabKind, rng: Rng): Exercise {
  switch (kind) {
    case 'repeat':
      return repeatExercise(deck, term)
    case 'translate':
      return canTranslate(term)
        ? translateExercise(deck, term)
        : definitionExercise(deck, term, rng)
    case 'meaning':
      return meaningExercise(deck, term, rng)
    case 'definition':
      return definitionExercise(deck, term, rng)
    case 'explain':
      return explainExercise(deck, term)
  }
}

/** Trappole di pronuncia: ascolta, ripeti, leggi la nota. */
export function trapExercise(word: TrapWord): Exercise {
  return {
    id: `${trapItemId(word)}#repeat`,
    module: MODULE,
    prompt: { text: word.en, speak: word.en, autoplay: true, hint: word.note },
    answer: {
      accepted: [word.en],
      mode: 'speak',
      fallback: 'selfgrade',
      reveal: `${word.en} — ${word.note}`,
    },
    explanation: `${word.en} = ${word.it}. ${word.note} Esempio: ${word.example}`,
    say: `${word.en}. ${word.example}`,
  }
}
