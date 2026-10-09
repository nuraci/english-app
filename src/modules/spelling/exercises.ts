import {
  charName,
  LETTER_GROUPS,
  natoSpelling,
  spellOut,
  spellReadable,
  type SpellingItem,
} from '../../content/generators/spelling'
import type { Accent } from '../../core/db/settings'
import { pick, shuffle, type Rng } from '../../core/random'
import type { Exercise } from '../../core/session'
import {
  categoryLabels,
  codeItemId,
  groupTips,
  letterGroups,
  letterItemId,
  letters,
  MODULE,
  personalItemId,
  skillItemId,
  type PersonalField,
} from './data'

export type SpellingOptions = { accent: Accent; nato: boolean }

const letterInfo = (l: string) => letters.find((x) => x.letter === l)

function letterExplanation(letter: string, accent: Accent): string {
  const info = letterInfo(letter)
  return `${letter} si dice «${charName(letter, accent)}»: ${info?.it ?? ''}.`
}

const spellingAnswer = (category?: SpellingItem['category']) => ({
  match: 'spelling' as const,
  ignoreDash: category !== 'email',
  letterGroups: LETTER_GROUPS,
})

function itemIdFor(item: SpellingItem): string {
  return item.category === 'email' || item.category === 'serial'
    ? skillItemId(item.category)
    : codeItemId(item.text)
}

/** Ascolta il nome di una lettera e scegli tra lettere che si confondono. */
export function letterListenExercise(letter: string, accent: Accent, rng: Rng): Exercise {
  const groupIds = LETTER_GROUPS[letter] ?? ['ee']
  const group = letterGroups.find((g) => g.id === pick(groupIds, rng))
  const others = shuffle(
    (group?.letters ?? []).filter((l) => l !== letter),
    rng,
  )
  const fill = shuffle(letterGroups.find((g) => g.id === 'ee')?.letters ?? [], rng)
  const choices = [letter, ...new Set([...others, ...fill].filter((l) => l !== letter))].slice(0, 4)
  return {
    id: `${letterItemId(letter)}#listen`,
    module: MODULE,
    prompt: { text: 'Ascolta: che lettera è?', speak: charName(letter, accent), autoplay: true },
    answer: {
      accepted: [letter],
      mode: 'choice',
      choices: shuffle(choices, rng),
      ...spellingAnswer(),
    },
    explanation: letterExplanation(letter, accent),
    tips: groupTips,
    say: charName(letter, accent),
  }
}

/** Ascolta il nome di una lettera e scrivila. */
export function letterTypeExercise(letter: string, accent: Accent): Exercise {
  return {
    id: `${letterItemId(letter)}#type`,
    module: MODULE,
    prompt: {
      text: 'Ascolta e scrivi la lettera',
      speak: charName(letter, accent),
      autoplay: true,
    },
    answer: { accepted: [letter], mode: 'type', ...spellingAnswer() },
    explanation: letterExplanation(letter, accent),
    tips: groupTips,
    say: charName(letter, accent),
  }
}

/** Di' il nome della lettera, poi controlla. */
export function letterNameExercise(letter: string, accent: Accent, nato: boolean): Exercise {
  const info = letterInfo(letter)
  return {
    id: `${letterItemId(letter)}#name`,
    module: MODULE,
    prompt: {
      text: `Come si dice la lettera «${letter}»?`,
      hint: 'Dilla ad alta voce, poi controlla.',
    },
    answer: {
      accepted: [letter],
      mode: 'selfgrade',
      reveal: `«${charName(letter, accent)}» — ${info?.it ?? ''}${nato && info ? ` · NATO: ${info.nato}` : ''}`,
    },
    explanation: letterExplanation(letter, accent),
    say: charName(letter, accent),
  }
}

/** Dettato: la voce fa lo spelling, l'utente scrive. Correzione lettera per lettera. */
export function dictationExercise(
  item: SpellingItem,
  options: SpellingOptions,
  index: number,
): Exercise {
  const spoken = spellOut(item.text, options.accent)
  const readable = spellReadable(item.text)
  return {
    id: `${itemIdFor(item)}#dictation-${index}`,
    module: MODULE,
    prompt: {
      text: `Dettato · ${categoryLabels[item.category]}`,
      speak: spoken,
      autoplay: true,
      hint:
        item.category === 'email' ? 'Scrivi l’indirizzo con @ e punti' : 'Scrivi lettere e cifre',
    },
    answer: { accepted: [item.text], mode: 'type', ...spellingAnswer(item.category) },
    explanation: `${item.text}: ${readable}${options.nato ? ` (NATO: ${natoSpelling(item.text)})` : ''}`,
    tips: groupTips,
    say: spoken,
  }
}

/** Modalità inversa: l'app mostra il codice, l'utente fa lo spelling a voce. */
export function aloudExercise(
  item: SpellingItem,
  options: SpellingOptions,
  index: number,
): Exercise {
  const readable = spellReadable(item.text)
  return {
    id: `${itemIdFor(item)}#aloud-${index}`,
    module: MODULE,
    prompt: { text: item.text, hint: 'Fai lo spelling ad alta voce, lettera per lettera' },
    answer: {
      accepted: [item.text],
      mode: 'speak',
      fallback: 'selfgrade',
      reveal: options.nato ? `${readable}\n${natoSpelling(item.text)}` : readable,
      ...spellingAnswer(item.category),
    },
    explanation: `${item.text}: ${readable}`,
    tips: groupTips,
    say: spellOut(item.text, options.accent),
  }
}

/** "Could you spell your surname, please?": come al telefono o alla reception. */
export function personalExercise(
  field: PersonalField,
  value: string,
  options: SpellingOptions,
): Exercise {
  const readable = spellReadable(value)
  return {
    id: `${personalItemId(field.kind)}#aloud`,
    module: MODULE,
    prompt: {
      text: field.question,
      speak: field.question,
      autoplay: true,
      hint: 'Rispondi facendo lo spelling, lettera per lettera',
    },
    answer: {
      accepted: [value],
      mode: 'speak',
      fallback: 'selfgrade',
      reveal: options.nato ? `${readable}\n${natoSpelling(value)}` : readable,
      match: 'spelling',
      ignoreDash: false,
      letterGroups: LETTER_GROUPS,
    },
    explanation: `${value}: ${readable}`,
    tips: groupTips,
    say: spellOut(value, options.accent),
  }
}
