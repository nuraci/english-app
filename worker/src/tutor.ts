import Anthropic from '@anthropic-ai/sdk'

export type Mode = 'interview' | 'conversation'
export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export type TutorRequest = {
  mode: Mode
  /** Argomento della conversazione libera. */
  topic?: string
  messages: ChatTurn[]
  /** Minuti trascorsi (colloquio da 15 minuti). */
  elapsedMinutes?: number
  /** Chiude la sessione: saluto finale e riepilogo. */
  finish?: boolean
}

export type Correction = { you_said: string; better: string; explanation_it: string }
export type TutorError = { category: 'irregular_verb' | 'vocabulary' | 'number' | 'grammar' | 'other'; key: string }

export type TutorReply = {
  reply: string
  corrections: Correction[]
  errors: TutorError[]
  interview_over: boolean
  summary_it: string
}

export const INTERVIEW_MINUTES = 15
export const MAX_CORRECTIONS = 3

/** Schema della risposta: il modello restituisce sempre questo JSON (structured outputs). */
export const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'What you say next, in English. Short: it is read aloud.' },
    corrections: {
      type: 'array',
      description: 'At most 3 useful corrections of the last user turn. Empty if there is nothing important.',
      items: {
        type: 'object',
        properties: {
          you_said: { type: 'string', description: 'The words the user said, quoted.' },
          better: { type: 'string', description: 'A better way to say it, in English.' },
          explanation_it: { type: 'string', description: 'Short, kind explanation in Italian.' },
        },
        required: ['you_said', 'better', 'explanation_it'],
        additionalProperties: false,
      },
    },
    errors: {
      type: 'array',
      description: 'Machine-readable list of the errors behind the corrections, for spaced repetition.',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['irregular_verb', 'vocabulary', 'number', 'grammar', 'other'] },
          key: {
            type: 'string',
            description: 'irregular_verb: base form (e.g. "write"). vocabulary: the correct English term. number: the number. Otherwise a short label.',
          },
        },
        required: ['category', 'key'],
        additionalProperties: false,
      },
    },
    interview_over: { type: 'boolean', description: 'True when you have closed the interview or conversation.' },
    summary_it: {
      type: 'string',
      description: 'Only when closing: an encouraging summary in Italian (strengths, 2-3 things to practise). Otherwise an empty string.',
    },
  },
  required: ['reply', 'corrections', 'errors', 'interview_over', 'summary_it'],
  additionalProperties: false,
} as const

const LEARNER = `The user is an Italian engineer: an expert in electronics, measurements, firmware and debugging, but their spoken English is A2-B1 and rusty (irregular verbs, numbers and letter spelling are weak spots). They get discouraged easily, so be warm, patient and encouraging - never harsh.

Their messages come from speech recognition. Ignore missing punctuation, capital letters and obvious recognition mistakes; correct only real language errors.

Speak clear, simple, natural English (B1 level). Keep every turn short - one to three sentences - because it is read aloud by a speech synthesizer: no lists, no markdown, no emoji.

After each user turn, choose at most three corrections that would help most (wrong verb forms, wrong words, word order, numbers). Explain each one briefly and kindly in Italian. If the turn is fine, return no corrections and simply continue. Never correct the same thing twice in a row.`

const INTERVIEW = `You are an interviewer at a semiconductor company, hiring a Validation Engineer for microcontrollers (lab validation, characterization across PVT, measurements with oscilloscopes and SMUs, firmware and debugging). Run a realistic but friendly interview of about ${INTERVIEW_MINUTES} minutes.

Ask one question at a time. Start with "Tell me about yourself". Mix HR, technical and behavioural questions (expect STAR answers for behavioural ones), and ask technical follow-up questions based on what the candidate actually said. If an answer is very short, gently ask for an example. Near the end, ask if they have questions for you, answer briefly, then close the interview politely.`

const CONVERSATION = (topic: string) => `You are a friendly conversation partner. Talk with the user about: ${topic}. Ask open questions, share short opinions or experiences, and keep the conversation going naturally. Follow the user's interests.`

export function buildSystem(request: Pick<TutorRequest, 'mode' | 'topic'>): string {
  const role = request.mode === 'interview' ? INTERVIEW : CONVERSATION(request.topic?.trim() || 'work and engineering projects')
  return `${role}\n\n${LEARNER}`
}

/** Messaggi per l'API: lo stato del tempo e la richiesta di chiusura viaggiano nell'ultimo turno dell'utente. */
export function buildMessages(request: TutorRequest): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = request.messages.map((m) => ({ role: m.role, content: m.content }))
  const notes: string[] = []
  if (request.mode === 'interview' && request.elapsedMinutes !== undefined) {
    const left = INTERVIEW_MINUTES - request.elapsedMinutes
    if (left <= 2) notes.push(`[Time: ${request.elapsedMinutes} of ${INTERVIEW_MINUTES} minutes. Start wrapping up the interview.]`)
  }
  if (request.finish) {
    notes.push('[The user wants to finish now. Close politely in one or two sentences, set interview_over to true and write summary_it.]')
  }
  if (messages.length === 0) {
    messages.push({ role: 'user', content: request.mode === 'interview' ? "[I'm ready. Please start the interview.]" : '[Please start the conversation.]' })
  } else if (notes.length) {
    const last = messages[messages.length - 1] as Anthropic.Beta.BetaMessageParam
    if (last.role === 'user') last.content = `${last.content as string}\n\n${notes.join(' ')}`
    else messages.push({ role: 'user', content: notes.join(' ') })
  }
  return messages
}

export type TutorConfig = { model: string; effort: 'low' | 'medium' | 'high'; maxTokens: number }

export type Usage = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number }

export type TutorResult = { reply: TutorReply; raw: string; usage: Usage; model: string }

export class TutorRefusal extends Error {}

/** Una chiamata al modello: risposta strutturata + utilizzo per il conteggio dei costi. */
export async function callTutor(client: Anthropic, config: TutorConfig, request: TutorRequest): Promise<TutorResult> {
  const response = await client.beta.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    // Su un rifiuto dei filtri di sicurezza la richiesta viene ripetuta sul modello consigliato.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: config.effort, format: { type: 'json_schema', schema: REPLY_SCHEMA } },
    // Il prompt di sistema e la storia crescono turno dopo turno: la cache ne riduce il costo.
    cache_control: { type: 'ephemeral' },
    system: buildSystem(request),
    messages: buildMessages(request),
  })

  const iterations = response.usage.iterations ?? []
  const usage: Usage = iterations.length
    ? iterations.reduce<Usage>(
        (acc, it) => ({
          inputTokens: acc.inputTokens + (it.input_tokens ?? 0),
          outputTokens: acc.outputTokens + (it.output_tokens ?? 0),
          cacheReadTokens: acc.cacheReadTokens + (it.cache_read_input_tokens ?? 0),
          cacheWriteTokens: acc.cacheWriteTokens + (it.cache_creation_input_tokens ?? 0),
        }),
        { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      )
    : {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      }

  if (response.stop_reason === 'refusal') throw new TutorRefusal('refusal')
  const raw = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  const parsed = JSON.parse(raw) as TutorReply
  const reply: TutorReply = {
    reply: String(parsed.reply ?? ''),
    corrections: (parsed.corrections ?? []).slice(0, MAX_CORRECTIONS),
    errors: (parsed.errors ?? []).slice(0, MAX_CORRECTIONS),
    interview_over: Boolean(parsed.interview_over),
    summary_it: String(parsed.summary_it ?? ''),
  }
  return { reply, raw, usage, model: response.model }
}
