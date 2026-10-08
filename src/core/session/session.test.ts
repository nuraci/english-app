import { describe, expect, it } from 'vitest'
import { Rating } from '../srs'
import {
  buildFeedback,
  createSession,
  currentExercise,
  evaluate,
  isFinished,
  itemIdOf,
  sessionReducer,
  sessionScore,
  type Exercise,
} from '.'

const ex = (
  id: string,
  accepted: string[],
  mode: Exercise['answer']['mode'] = 'type',
): Exercise => ({
  id,
  module: 'test',
  prompt: { text: id },
  answer: { accepted, mode },
})

describe('evaluate', () => {
  it('risposta scritta corretta → Good', () => {
    const e = evaluate(ex('a', ['forty-seven']), { kind: 'text', value: '47' })
    expect(e).toMatchObject({ correct: true, kind: 'exact', grade: Rating.Good })
  })

  it('refuso → corretto ma Hard', () => {
    const e = evaluate(ex('a', ['oscilloscope']), { kind: 'text', value: 'oscilloscpe' })
    expect(e).toMatchObject({ correct: true, kind: 'typo', grade: Rating.Hard })
  })

  it('errore → Again', () => {
    const e = evaluate(ex('a', ['thirteen']), { kind: 'text', value: 'thirty' })
    expect(e).toMatchObject({ correct: false, grade: Rating.Again })
  })

  it('con la voce vale la trascrizione alternativa giusta', () => {
    const e = evaluate(ex('a', ['I wrote the firmware'], 'speak'), {
      kind: 'speech',
      transcripts: ['I rode the firmware', 'I wrote the firmware'],
    })
    expect(e).toMatchObject({ correct: true, given: 'I wrote the firmware' })
  })

  it('trascrizione vuota non va in errore', () => {
    const e = evaluate(ex('a', ['ran'], 'speak'), { kind: 'speech', transcripts: [] })
    expect(e.correct).toBe(false)
  })

  it('autovalutazione → voto corrispondente', () => {
    expect(evaluate(ex('a', ['x'], 'selfgrade'), { kind: 'self', grade: 'easy' })).toMatchObject({
      correct: true,
      grade: Rating.Easy,
    })
    expect(evaluate(ex('a', ['x'], 'selfgrade'), { kind: 'self', grade: 'again' }).correct).toBe(
      false,
    )
  })
})

describe('buildFeedback', () => {
  it('spiega in modo specifico la parola sbagliata', () => {
    const f = buildFeedback(evaluate(ex('a', ['thirteen']), { kind: 'text', value: 'thirty' }))
    expect(f.tone).not.toBe('success')
    expect(f.detail).toBe('Hai scritto «thirty», era «thirteen».')
  })

  it('per la voce dice cosa ha sentito', () => {
    const f = buildFeedback(
      evaluate(ex('a', ['thirteen'], 'speak'), { kind: 'speech', transcripts: ['thirty'] }),
    )
    expect(f.detail).toBe('Ho sentito «thirty», era «thirteen».')
  })

  it('"Quasi!" per le risposte vicine', () => {
    const f = buildFeedback(evaluate(ex('a', ['ran']), { kind: 'text', value: 'run' }))
    expect(f).toMatchObject({ tone: 'almost', title: 'Quasi!' })
  })

  it('il refuso è un successo con la grafia corretta', () => {
    const f = buildFeedback(
      evaluate(ex('a', ['oscilloscope']), { kind: 'text', value: 'oscilloscpe' }),
    )
    expect(f.tone).toBe('success')
    expect(f.detail).toBe('Hai scritto «oscilloscpe», si scrive «oscilloscope».')
  })

  it('non dice mai solo "Sbagliato"', () => {
    for (const value of ['', 'banana', 'run', 'thirty']) {
      const f = buildFeedback(evaluate(ex('a', ['thirteen']), { kind: 'text', value }))
      expect(f.title.toLowerCase()).not.toContain('sbagliato')
      expect(f.detail).toBeTruthy()
    }
  })
})

describe('sessionReducer', () => {
  it('scorre gli esercizi e conta i risultati', () => {
    const exercises = [ex('a', ['one']), ex('b', ['two'])]
    let s = createSession(exercises, 0)
    expect(currentExercise(s)?.id).toBe('a')

    s = sessionReducer(s, { type: 'next' }) // senza risposta non si avanza
    expect(s.index).toBe(0)

    s = sessionReducer(s, {
      type: 'answer',
      evaluation: evaluate(exercises[0] as Exercise, { kind: 'text', value: '1' }),
    })
    s = sessionReducer(s, {
      type: 'answer',
      evaluation: evaluate(exercises[0] as Exercise, { kind: 'text', value: 'x' }),
    })
    expect(s.results).toHaveLength(1) // una sola risposta per esercizio

    s = sessionReducer(s, { type: 'next' })
    s = sessionReducer(s, {
      type: 'answer',
      evaluation: evaluate(exercises[1] as Exercise, { kind: 'text', value: 'three' }),
    })
    s = sessionReducer(s, { type: 'next' })

    expect(isFinished(s)).toBe(true)
    expect(sessionScore(s)).toEqual({ total: 2, correct: 1 })

    s = sessionReducer(s, { type: 'restart', now: 1 })
    expect(s).toMatchObject({ index: 0, results: [], startedAt: 1 })
  })
})

describe('ripasso degli errori a fine sessione', () => {
  it('ripropone una sola volta l’esercizio sbagliato e non lo conta nel punteggio', () => {
    const exercises = [ex('verbs:go#past', ['went'])]
    let s = createSession(exercises, 0)
    s = sessionReducer(s, {
      type: 'answer',
      evaluation: evaluate(exercises[0] as Exercise, { kind: 'text', value: 'goed' }),
    })
    s = sessionReducer(s, { type: 'next', retry: true })
    expect(currentExercise(s)?.id).toBe('verbs:go#past#retry')
    expect(itemIdOf(currentExercise(s) as Exercise)).toBe('verbs:go')

    s = sessionReducer(s, {
      type: 'answer',
      evaluation: evaluate(currentExercise(s) as Exercise, { kind: 'text', value: 'went' }),
    })
    s = sessionReducer(s, { type: 'next', retry: true })
    expect(isFinished(s)).toBe(true)
    expect(sessionScore(s)).toEqual({ total: 1, correct: 0 })
  })
})
