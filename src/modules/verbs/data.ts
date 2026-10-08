import verbsContent from '../../content/verbs.json'

export type VerbForm = 'base' | 'past' | 'participle'

export type Verb = {
  base: string
  /** Forme accettate: la prima è quella principale (es. ["learned", "learnt"]). */
  past: string[]
  participle: string[]
  it: string
  group: string
  frequencyRank: number
  /** Frase d'esempio: la forma del verbo è tra graffe, "I {wrote} the firmware". */
  example: { en: string; it: string }
  /** Nota di pronuncia o d'uso, in italiano. */
  note?: string
  /** Pronuncia per la sintesi vocale quando la grafia inganna (read → "red"). */
  say?: Partial<Record<VerbForm, string>>
}

export type VerbGroup = { id: string; name: string; pattern: string; description: string }

export const MODULE = 'verbs'
export const LEVEL_SIZE = 50

export const verbs: Verb[] = [...(verbsContent.verbs as Verb[])].sort(
  (a, b) => a.frequencyRank - b.frequencyRank,
)
export const verbGroups: VerbGroup[] = verbsContent.groups

export function verbItemId(verb: Pick<Verb, 'base'>): string {
  return `${MODULE}:${verb.base}`
}

/** Livello del verbo: 1 per i 50 più frequenti, 2 per i successivi 50, ecc. */
export function levelOf(verb: Pick<Verb, 'frequencyRank'>): number {
  return Math.ceil(verb.frequencyRank / LEVEL_SIZE)
}

export function formsOf(verb: Verb, form: VerbForm): string[] {
  return form === 'base' ? [verb.base] : verb[form]
}

/** "write → wrote → written", con le alternative separate da barra. */
export function formsLabel(verb: Verb): string {
  return [verb.base, verb.past.join('/'), verb.participle.join('/')].join(' → ')
}

/** Testo per la sintesi vocale: "write, wrote, written", con la pronuncia corretta. */
export function formsSpeech(verb: Verb): string {
  return (['base', 'past', 'participle'] as const).map((f) => sayForm(verb, f)).join(', ')
}

export function sayForm(verb: Verb, form: VerbForm): string {
  return verb.say?.[form] ?? formsOf(verb, form)[0] ?? verb.base
}

/** La frase d'esempio con il verbo in evidenza, divisa in parti: [prima, verbo, dopo]. */
export function splitExample(verb: Verb): [string, string, string] {
  const match = /^(.*)\{([^}]+)\}(.*)$/.exec(verb.example.en)
  if (!match) return [verb.example.en, '', '']
  return [match[1] ?? '', match[2] ?? '', match[3] ?? '']
}

/** Quale forma compare nella frase d'esempio. */
export function exampleForm(verb: Verb): Exclude<VerbForm, 'base'> {
  const [, used] = splitExample(verb)
  return verb.past.includes(used) ? 'past' : 'participle'
}
