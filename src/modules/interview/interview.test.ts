import { describe, expect, it } from 'vitest'
import { createRng } from '../../core/random'
import { db } from '../../core/db/db'
import {
  durationComment,
  durationVerdict,
  formatDuration,
  keywordsHit,
  wordsPerMinute,
} from './analysis'
import { checklist, lifesavers, questions, questionsToAsk, tellMeSteps } from './data'
import { buildInterviewPlan, INTERVIEW_LENGTH } from './session'
import {
  deleteInterviewSession,
  finishInterviewSession,
  getMyAnswers,
  interviewHistory,
  practiceCounts,
  saveAttempt,
  saveMyAnswer,
  startInterviewSession,
} from './storage'

describe('contenuti', () => {
  it('domande HR, tecniche e comportamentali complete', () => {
    expect(questions.length).toBeGreaterThanOrEqual(30)
    for (const cat of ['hr', 'technical', 'behavioral']) {
      expect(questions.filter((q) => q.category === cat).length, cat).toBeGreaterThanOrEqual(8)
    }
    for (const q of questions) {
      expect(q.text.endsWith('?') || q.text.endsWith('.'), q.id).toBe(true)
      expect(q.keywords.length, q.id).toBeGreaterThanOrEqual(4)
      expect(q.targetSeconds[0]).toBeLessThan(q.targetSeconds[1])
    }
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
    const required = [
      'Tell me about yourself.',
      'Describe a difficult bug you solved.',
      'How do you validate a new peripheral?',
      'How do you measure power consumption in low-power modes?',
      'Why do you want to work at NXP?',
    ]
    expect(questions.map((q) => q.text)).toEqual(expect.arrayContaining(required))
  })

  it('costruttore, frasi salvavita, domande da fare, checklist', () => {
    expect(tellMeSteps.map((s) => s.id)).toEqual(['who', 'experience', 'strengths', 'why'])
    expect(lifesavers.map((p) => p.en)).toEqual(
      expect.arrayContaining([
        'Could you repeat the question, please?',
        'Let me think about that for a second.',
      ]),
    )
    expect(questionsToAsk.length).toBeGreaterThanOrEqual(8)
    expect(checklist.length).toBeGreaterThanOrEqual(3)
  })
})

describe('analisi della risposta', () => {
  it('riconosce le parole chiave anche con desinenze diverse', () => {
    const t =
      'First I study the specification, then I write test plans and I automate the tests. We tested many corner cases across PVT.'
    expect(
      keywordsHit(t, ['specification', 'test plan', 'corner cases', 'PVT', 'automation', 'report']),
    ).toEqual(['specification', 'test plan', 'corner cases', 'PVT'])
    expect(keywordsHit('I measured the leakage', ['leakage current', 'measure'])).toEqual([
      'measure',
    ])
  })

  it('durata e ritmo', () => {
    expect(durationVerdict(30_000, [60, 120])).toBe('short')
    expect(durationVerdict(90_000, [60, 120])).toBe('good')
    expect(durationVerdict(150_000, [60, 120])).toBe('long')
    expect(durationComment(90_000, { targetSeconds: [60, 120] })).toContain('perfetta')
    expect(formatDuration(95_000)).toBe('1:35')
    expect(formatDuration(42_000)).toBe('42 s')
    expect(wordsPerMinute('one two three four five six seven eight nine ten', 6000)).toBe(100)
    expect(wordsPerMinute('hi', 1000)).toBeNull()
  })
})

describe('piano della prova (10 domande)', () => {
  it('inizia con Tell me about yourself e finisce con le domande al selezionatore', () => {
    const plan = buildInterviewPlan(new Map(), createRng(1))
    expect(plan).toHaveLength(INTERVIEW_LENGTH)
    expect(plan[0]?.id).toBe('tell-me')
    expect(plan.at(-1)?.id).toBe('any-questions')
    expect(new Set(plan.map((q) => q.id)).size).toBe(INTERVIEW_LENGTH)
    expect(plan.filter((q) => q.category === 'technical')).toHaveLength(4)
    expect(plan.filter((q) => q.category === 'behavioral')).toHaveLength(2)
  })

  it('le domande tecniche seguono i pacchetti attivi', () => {
    const base = buildInterviewPlan(new Map(), createRng(3))
    expect(base.every((q) => q.pack === 'semiconductors')).toBe(true)
    let iotSeen = false
    for (let seed = 0; seed < 20; seed++) {
      const plan = buildInterviewPlan(new Map(), createRng(seed), [
        'semiconductors',
        'embedded-iot',
      ])
      if (plan.some((q) => q.pack === 'embedded-iot')) iotSeen = true
    }
    expect(iotSeen).toBe(true)
  })

  it('preferisce le domande provate meno volte', () => {
    const technical = questions.filter((q) => q.category === 'technical')
    const counts = new Map(technical.slice(0, 10).map((q) => [q.id, 3]))
    const plan = buildInterviewPlan(counts, createRng(2))
    const chosen = plan.filter((q) => q.category === 'technical').map((q) => q.id)
    expect(chosen.every((id) => !counts.has(id))).toBe(true)
  })
})

describe('salvataggio', () => {
  it('salva trascrizioni e audio, li ritrova nello storico e li elimina', async () => {
    const id = await startInterviewSession(10, 1000)
    await saveAttempt(
      {
        sessionId: id,
        questionId: 'tell-me',
        question: 'Tell me about yourself.',
        transcript: 'I am a validation engineer.',
        durationMs: 65_000,
        checklist: ['clear'],
        keywordsHit: ['validation'],
      },
      {
        blob: new Blob(['audio'], { type: 'audio/webm' }),
        mimeType: 'audio/webm',
        durationMs: 65_000,
      },
      2000,
    )
    await saveAttempt(
      {
        sessionId: id,
        questionId: 'pvt',
        question: 'What does PVT mean?',
        transcript: '',
        durationMs: 40_000,
        checklist: [],
        keywordsHit: [],
      },
      undefined,
      3000,
    )
    await finishInterviewSession(id, 2, 4000)

    const [entry] = await interviewHistory()
    expect(entry?.session).toMatchObject({ id, correct: 2, endedAt: 4000 })
    expect(entry?.attempts.map((a) => a.questionId)).toEqual(['tell-me', 'pvt'])
    expect(entry?.attempts[0]?.recordingId).toBeDefined()
    expect(await db.recordings.count()).toBe(1)
    expect((await practiceCounts()).get('tell-me')).toBe(1)

    await deleteInterviewSession(id)
    expect(await interviewHistory()).toEqual([])
    expect(await db.recordings.count()).toBe(0)
  })

  it('le risposte scritte si salvano per domanda', async () => {
    await saveMyAnswer('weakness', 'My English.')
    await saveMyAnswer('weakness', 'My spoken English.')
    await saveMyAnswer('tell-me', 'I am Mario.')
    expect(await getMyAnswers()).toEqual({
      weakness: 'My spoken English.',
      'tell-me': 'I am Mario.',
    })
  })
})
