import { describe, expect, it } from 'vitest'
import { createEmptyCard, Rating, State } from 'ts-fsrs'
import type { ItemRecord } from '../../core/db/db'
import { createRng } from '../../core/random'
import { evaluate, itemIdOf } from '../../core/session'
import { scheduleReview } from '../../core/srs'
import {
  exampleForm,
  formsLabel,
  formsSpeech,
  levelOf,
  splitExample,
  verbGroups,
  verbItemId,
  verbs,
  type Verb,
} from './data'
import { flashcardExercise, formExercise, listenExercise, sentenceExercise } from './exercises'
import { computeProgress } from './progress'
import { buildVerbSession, SESSION_LENGTH } from './session'

const now = new Date('2026-10-08T08:00:00Z')
const verb = (base: string) => verbs.find((v) => v.base === base) as Verb

function item(
  v: Verb,
  state: 'learning' | 'learned',
  due = now.getTime() + 86_400_000,
): ItemRecord {
  let card = createEmptyCard(now)
  card = scheduleReview(card, Rating.Good, now)
  if (state === 'learned') card = { ...card, state: State.Review }
  return { id: verbItemId(v), module: 'verbs', card, due, createdAt: now.getTime() }
}

describe('dataset verbs.json', () => {
  it('ha 150 verbi con rank unici e campi completi', () => {
    expect(verbs).toHaveLength(150)
    expect(new Set(verbs.map((v) => v.base)).size).toBe(150)
    expect(verbs.map((v) => v.frequencyRank)).toEqual(verbs.map((_, i) => i + 1))
    for (const v of verbs) {
      expect(v.it, v.base).toBeTruthy()
      expect(v.past.length, v.base).toBeGreaterThan(0)
      expect(v.participle.length, v.base).toBeGreaterThan(0)
      expect(v.example.it, v.base).toBeTruthy()
    }
  })

  it('ogni verbo appartiene a un gruppo esistente e ogni gruppo ha verbi', () => {
    const ids = new Set(verbGroups.map((g) => g.id))
    for (const v of verbs) expect(ids.has(v.group), v.base).toBe(true)
    for (const g of verbGroups)
      expect(
        verbs.some((v) => v.group === g.id),
        g.id,
      ).toBe(true)
  })

  it('ogni esempio contiene una forma del verbo tra graffe', () => {
    for (const v of verbs) {
      const [, used] = splitExample(v)
      expect([...v.past, ...v.participle], v.base).toContain(used)
    }
  })

  it('i primi 50 sono il livello 1', () => {
    expect(verbs.slice(0, 50).every((v) => levelOf(v) === 1)).toBe(true)
    expect(levelOf(verbs[50] as Verb)).toBe(2)
  })

  it('read si pronuncia «red» al passato', () => {
    expect(formsSpeech(verb('read'))).toBe('reed, red, red')
    expect(formsLabel(verb('learn'))).toBe('learn → learned/learnt → learned/learnt')
  })
})

describe('esercizi', () => {
  const rng = createRng(1)

  it('flashcard: autovalutazione con le tre forme', () => {
    const ex = flashcardExercise(verb('write'), true)
    expect(ex.answer.mode).toBe('selfgrade')
    expect(ex.answer.accepted).toEqual(['write → wrote → written'])
    expect(ex.say).toBe('write, wrote, written')
    expect(itemIdOf(ex)).toBe('verbs:write')
  })

  it('forma scritta: accetta tutte le alternative', () => {
    const be = formExercise(verb('be'), 'past')
    for (const value of ['was', 'were', 'was/were', 'Was, were']) {
      expect(evaluate(be, { kind: 'text', value }).correct, value).toBe(true)
    }
    const learn = formExercise(verb('learn'), 'participle')
    expect(evaluate(learn, { kind: 'text', value: 'learnt' }).correct).toBe(true)
    expect(
      evaluate(formExercise(verb('go'), 'past'), { kind: 'text', value: 'goed' }).correct,
    ).toBe(false)
  })

  it('completa la frase', () => {
    const ex = sentenceExercise(verb('run'))
    expect(ex.prompt.text).toBe('The board ___ for 48 hours without errors. (run)')
    expect(evaluate(ex, { kind: 'text', value: 'ran' }).correct).toBe(true)
    expect(evaluate(ex, { kind: 'text', value: 'run' })).toMatchObject({
      correct: false,
      kind: 'close',
    })
    expect(exampleForm(verb('do'))).toBe('participle')
  })

  it('ascolta e riconosci: 4 scelte diverse, una giusta', () => {
    for (const v of verbs) {
      const ex = listenExercise(v, verbs, rng)
      const choices = ex.answer.choices ?? []
      expect(new Set(choices).size, v.base).toBe(4)
      expect(choices, v.base).toContain(ex.answer.accepted[0])
    }
  })
})

describe('computeProgress', () => {
  it('all’inizio: livello 1, gruppo del verbo più frequente', () => {
    const p = computeProgress(verbs, verbGroups, [])
    expect(p.unlockedLevel).toBe(1)
    expect(p.currentGroup?.id).toBe('special')
    expect(p.nextNewVerbs.map((v) => v.base)).toEqual(['be', 'do', 'go', 'come', 'become'])
  })

  it('finisce il gruppo iniziato prima di cambiarlo', () => {
    // "have" (rank 2, gruppo abb) è più frequente di "make", ma un gruppo iniziato ha la precedenza.
    const items = ['be', 'do', 'go', 'come', 'become', 'make'].map((b) => item(verb(b), 'learning'))
    const p = computeProgress(verbs, verbGroups, items)
    expect(p.currentGroup?.id).toBe('abb')
    expect(p.nextNewVerbs[0]?.base).toBe('have')
    expect(p.nextNewVerbs.every((v) => levelOf(v) === 1)).toBe(true)
  })

  it('sblocca il livello 2 quando il livello 1 è visto tutto e imparato al 70%', () => {
    const level1 = verbs.filter((v) => levelOf(v) === 1)
    const almost = level1.map((v, i) => item(v, i < 34 ? 'learned' : 'learning'))
    expect(computeProgress(verbs, verbGroups, almost).unlockedLevel).toBe(1)

    const enough = level1.map((v, i) => item(v, i < 35 ? 'learned' : 'learning'))
    const p = computeProgress(verbs, verbGroups, enough)
    expect(p.unlockedLevel).toBe(2)
    expect(p.levels[1]?.unlocked).toBe(true)
    expect(p.nextNewVerbs.every((v) => levelOf(v) === 2)).toBe(true)
  })
})

describe('buildVerbSession (accettazione: ripasso SRS + verbi nuovi del gruppo corrente)', () => {
  it('prima sessione: solo verbi nuovi del primo gruppo', () => {
    const plan = buildVerbSession({ verbs, groups: verbGroups, items: [], now, rng: createRng(7) })
    expect(plan.group?.id).toBe('special')
    expect(plan.newVerbs).toHaveLength(5)
    expect(plan.exercises).toHaveLength(10) // flashcard + esercizio di fissaggio per ciascuno
    expect(plan.exercises[0]?.answer.mode).toBe('selfgrade')
  })

  it('mescola ripassi scaduti e verbi nuovi dello stesso gruppo, in circa 20 esercizi', () => {
    const seen = verbs
      .filter((v) => v.group === 'special' || v.group === 'same')
      .filter((v) => levelOf(v) === 1)
    const items = seen.map((v, i) =>
      item(v, i % 2 ? 'learned' : 'learning', now.getTime() - (i + 1) * 60_000),
    )
    const plan = buildVerbSession({ verbs, groups: verbGroups, items, now, rng: createRng(3) })

    expect(plan.reviewVerbs.length).toBeGreaterThan(0)
    expect(plan.newVerbs.length).toBeGreaterThan(0)
    const groupOfNew = new Set(plan.newVerbs.map((v) => v.group))
    expect(groupOfNew.size).toBe(1)
    expect(plan.exercises.length).toBeLessThanOrEqual(SESSION_LENGTH)
    expect(plan.exercises.length).toBeGreaterThanOrEqual(seen.length)

    const ids = plan.exercises.map(itemIdOf)
    for (const v of plan.newVerbs) expect(ids.filter((id) => id === verbItemId(v))).toHaveLength(2)
    for (const v of plan.reviewVerbs) expect(ids).toContain(verbItemId(v))
    // I verbi nuovi si alternano ai ripassi: la sessione non inizia con un blocco di soli nuovi.
    expect(ids.slice(0, 4).some((id) => plan.reviewVerbs.some((v) => verbItemId(v) === id))).toBe(
      true,
    )
  })

  it('con tanti ripassi arretrati introduce al massimo 2 verbi nuovi', () => {
    const items = verbs.slice(0, 15).map((v) => item(v, 'learned', now.getTime() - 1000))
    const plan = buildVerbSession({ verbs, groups: verbGroups, items, now, rng: createRng(5) })
    expect(plan.newVerbs.length).toBeLessThanOrEqual(2)
    expect(plan.reviewVerbs).toHaveLength(15)
    expect(plan.exercises.length).toBe(15 + plan.newVerbs.length * 2)
  })

  it('a parità di seme, stessa sessione', () => {
    const a = buildVerbSession({ verbs, groups: verbGroups, items: [], now, rng: createRng(9) })
    const b = buildVerbSession({ verbs, groups: verbGroups, items: [], now, rng: createRng(9) })
    expect(a.exercises).toEqual(b.exercises)
  })
})
