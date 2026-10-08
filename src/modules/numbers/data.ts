import numbersContent from '../../content/numbers.json'

export const MODULE = 'numbers'

export type NumberLevel = { level: number; name: string; description: string; kinds: string[] }

export const numberLevels: NumberLevel[] = numbersContent.levels
export const kindTips: Record<string, string> = numbersContent.kindTips
export const errorTips: Record<string, string> = numbersContent.errorTips
export const errorNames: Record<string, string> = numbersContent.errorNames

/** L'item SRS è l'abilità (livello + tipo), non il singolo numero: i numeri sono infiniti. */
export function skillId(level: number, kind: string): string {
  return `${MODULE}:L${level}:${kind}`
}

export function parseSkillId(id: string): { level: number; kind: string } | undefined {
  const match = /^numbers:L(\d+):(.+)$/.exec(id)
  return match ? { level: Number(match[1]), kind: match[2] as string } : undefined
}
