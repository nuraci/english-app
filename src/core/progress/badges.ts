import type { ActivityData } from './xp'

export type BadgeInput = ActivityData & {
  bestStreak: number
  totalXp: number
  weekGoalReached: boolean
  verbsSeen: number
}

export type Badge = {
  id: string
  emoji: string
  name: string
  description: string
  earned: boolean
}

type Rule = Omit<Badge, 'earned'> & { test: (d: BadgeInput) => boolean }

const completed = (d: BadgeInput, module: string) =>
  d.sessions.filter((s) => s.module === module && s.endedAt !== undefined)

const RULES: Rule[] = [
  {
    id: 'first-step',
    emoji: '👣',
    name: 'Primo passo',
    description: 'Completa la prima sessione.',
    test: (d) => d.sessions.some((s) => s.endedAt !== undefined),
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    name: 'Tre di fila',
    description: 'Allenati 3 giorni consecutivi.',
    test: (d) => d.bestStreak >= 3,
  },
  {
    id: 'streak-7',
    emoji: '🔥',
    name: 'Una settimana',
    description: 'Allenati 7 giorni consecutivi.',
    test: (d) => d.bestStreak >= 7,
  },
  {
    id: 'streak-30',
    emoji: '🏆',
    name: 'Un mese',
    description: 'Allenati 30 giorni consecutivi.',
    test: (d) => d.bestStreak >= 30,
  },
  {
    id: 'week-goal',
    emoji: '🎯',
    name: 'Obiettivo settimanale',
    description: 'Raggiungi l’obiettivo della settimana.',
    test: (d) => d.weekGoalReached,
  },
  {
    id: 'numbers-perfect',
    emoji: '🔢',
    name: 'Numeri senza errori',
    description: 'Una sessione di numeri da almeno 10 esercizi, tutti giusti.',
    test: (d) => completed(d, 'numbers').some((s) => s.total >= 10 && s.correct === s.total),
  },
  {
    id: 'spelling-perfect',
    emoji: '🔤',
    name: 'Spelling perfetto',
    description: 'Un dettato da 10 codici senza errori.',
    test: (d) => completed(d, 'spelling').some((s) => s.total >= 10 && s.correct === s.total),
  },
  {
    id: 'first-interview',
    emoji: '🎤',
    name: 'Primo colloquio completo',
    description: 'Rispondi a tutte le 10 domande di una prova.',
    test: (d) => completed(d, 'interview').some((s) => s.correct >= 10),
  },
  {
    id: 'verbs-50',
    emoji: '🔁',
    name: '50 verbi',
    description: 'Incontra 50 verbi irregolari.',
    test: (d) => d.verbsSeen >= 50,
  },
  {
    id: 'shadower',
    emoji: '🎧',
    name: 'Ombra perfetta',
    description: 'Fai 5 sessioni di shadowing.',
    test: (d) => completed(d, 'shadowing').length >= 5,
  },
  {
    id: 'xp-1000',
    emoji: '⭐',
    name: '1000 XP',
    description: 'Raggiungi 1000 punti esperienza.',
    test: (d) => d.totalXp >= 1000,
  },
]

export function computeBadges(input: BadgeInput): Badge[] {
  return RULES.map(({ test, ...badge }) => ({ ...badge, earned: test(input) }))
}
