import { questionById } from '../../modules/interview/data'
import { decks, trapList } from '../../modules/vocab/data'

export const MODULE_NAMES: Record<string, string> = {
  verbs: 'Verbi',
  numbers: 'Numeri',
  spelling: 'Spelling',
  vocab: 'Vocabolario',
  interview: 'Colloquio',
  shadowing: 'Shadowing',
  tutor: 'Tutor AI',
}

const NUMBER_KINDS: Record<string, string> = {
  'teen-ty': '-teen / -ty',
  small: 'da 0 a 20',
  tens: 'da 21 a 99',
  big: 'grandi numeri',
  ordinal: 'ordinali',
  year: 'anni',
  date: 'date',
  time: 'orari',
  decimal: 'decimali',
  negative: 'negativi',
  percent: 'percentuali',
  price: 'prezzi',
  phone: 'numeri di telefono',
  code: 'codici',
  resistance: 'resistenze',
  capacitance: 'capacità',
  voltage: 'tensioni',
  current: 'correnti',
  frequency: 'frequenze',
  'time-unit': 'tempi (ns, µs, ms)',
  power: 'potenze',
  tolerance: 'tolleranze',
  range: 'range',
  hex: 'esadecimale',
  bit: 'bit',
  register: 'registri',
}

/** Nome leggibile di un item SRS: "verbs:write" → "write", "numbers:L1:teen-ty" → "-teen / -ty". */
export function itemLabel(id: string): string {
  const [module, a = '', b = ''] = id.split(':')
  switch (module) {
    case 'verbs':
      return a
    case 'vocab':
      if (a === 'trap') return trapList.words.find((w) => w.id === b)?.en ?? b
      return decks.find((d) => d.id === a)?.terms.find((t) => t.id === b)?.en ?? b
    case 'spelling':
      if (a === 'letter') return `lettera ${b}`
      if (a === 'code') return id.slice('spelling:code:'.length)
      if (a === 'email') return 'email dettate'
      if (a === 'serial') return 'numeri di serie'
      return 'i tuoi dati'
    case 'numbers':
      return NUMBER_KINDS[b] ?? b
    case 'interview':
      return questionById(a)?.text ?? a
    default:
      return id
  }
}
