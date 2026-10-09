import { expect, test, type Page, type Route } from '@playwright/test'

const ANSWERS = [
  'I am a validation engineer and I have wrote many test plans for microcontrollers.',
  'Last year I found a bug in the ADC with the oscilloscope.',
  'I measure the current with a SMU in low power mode.',
  'I automate the tests with Python scripts.',
  'I would like to know how big is the team.',
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript((answers: string[]) => {
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10)
    }
    window.speechSynthesis.cancel = () => {}
    let n = 0
    class FakeRecognition {
      lang = ''
      continuous = false
      interimResults = false
      maxAlternatives = 1
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      static available = () => Promise.resolve('unavailable')
      start() {
        const text = answers[n++ % answers.length]
        setTimeout(
          () =>
            this.onresult?.({
              resultIndex: 0,
              results: [Object.assign([{ transcript: text }], { isFinal: true })],
            }),
          20,
        )
      }
      stop() {
        setTimeout(() => this.onend?.(), 10)
      }
      abort() {
        this.stop()
      }
    }
    const w = window as unknown as Record<string, unknown>
    w.SpeechRecognition = FakeRecognition
    w.webkitSpeechRecognition = FakeRecognition
  }, ANSWERS)
})

type Body = {
  mode: string
  messages: { role: string; content: string }[]
  elapsedMinutes?: number
  finish?: boolean
}

/** Backend finto: domande di colloquio, una correzione sul verbo e il riepilogo finale. */
async function mockTutor(page: Page) {
  const bodies: Body[] = []
  let requests = 0
  await page.route('https://tutor.test/api/**', async (route: Route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204 })
    expect(req.headers()['authorization']).toBe('Bearer my-access-code')
    if (req.url().endsWith('/api/usage')) {
      return route.fulfill({
        json: {
          model: 'claude-opus-5-5',
          quota: {
            requests,
            tokens: requests * 2000,
            costUsd: requests * 0.01,
            requestsLeft: 150 - requests,
            tokensLeft: 1,
          },
        },
      })
    }
    const body = req.postDataJSON() as Body
    bodies.push(body)
    requests++
    const last = body.messages.at(-1)?.content ?? ''
    const closing = body.finish === true
    const questions = [
      'Tell me about yourself.',
      'Describe a difficult bug you solved.',
      'How do you measure power consumption in low-power modes?',
      'How do you automate your tests?',
      'Do you have any questions for us?',
    ]
    const userTurns = body.messages.filter((m) => m.role === 'user').length - 1
    const reply = {
      reply: closing
        ? 'Thank you, it was a pleasure. We will be in touch soon.'
        : questions[Math.min(userTurns, questions.length - 1)],
      corrections: last.includes('have wrote')
        ? [
            {
              you_said: 'I have wrote',
              better: 'I have written',
              explanation_it: 'Il participio di write è written: I have written.',
            },
          ]
        : [],
      errors: last.includes('have wrote') ? [{ category: 'irregular_verb', key: 'write' }] : [],
      interview_over: closing,
      summary_it: closing
        ? 'Ottimo colloquio! Hai spiegato bene il tuo lavoro. Da allenare: participi irregolari e domande indirette.'
        : '',
    }
    return route.fulfill({
      json: {
        ...reply,
        raw: JSON.stringify(reply),
        model: 'claude-opus-5-5',
        usage: { tokens: 2000, costUsd: 0.01 },
        quota: {
          requests,
          tokens: requests * 2000,
          costUsd: requests * 0.01,
          requestsLeft: 150 - requests,
          tokensLeft: 1,
        },
      },
    })
  })
  return bodies
}

async function holdToTalk(page: Page) {
  const button = page.getByRole('button', { name: 'Tieni premuto per parlare' })
  await expect(button).toBeEnabled()
  await button.hover()
  await page.mouse.down()
  await expect(page.getByText(/I |Last year/).last()).toBeVisible()
  await page.waitForTimeout(100)
  await page.mouse.up()
}

test('colloquio di 15 minuti interamente a voce, con riepilogo degli errori salvato', async ({
  page,
}) => {
  await page.clock.install()
  const bodies = await mockTutor(page)

  await page.goto('/impostazioni')
  await page.getByLabel('Indirizzo del tutor').fill('https://tutor.test')
  await page.getByLabel('Indirizzo del tutor').blur()
  await page.getByLabel('Codice di accesso').fill('my-access-code')
  await page.getByLabel('Codice di accesso').blur()
  await page.getByRole('button', { name: 'Verifica la connessione' }).click()
  await expect(page.getByText(/Collegato ✓ · modello claude-opus-5-5/)).toBeVisible()

  await page.goto('/allenamenti/tutor')
  await page.getByRole('link', { name: 'Inizia il colloquio' }).click()
  const chat = page.getByTestId('tutor-chat')
  await expect(chat).toContainText('Tell me about yourself.')
  await expect(page.getByTestId('tutor-timer')).toContainText('15:00')

  for (let i = 0; i < ANSWERS.length; i++) {
    await page.clock.fastForward('03:30')
    await holdToTalk(page)
    await expect(chat).toContainText(ANSWERS[i] as string)
    if (i === 0) {
      // Correzione gentile, in italiano, sotto la risposta.
      await expect(page.getByTestId('tutor-corrections').first()).toContainText(
        'Il participio di write è written',
      )
    }
  }

  // Oltre il tempo il colloquio si chiude da solo: riepilogo finale.
  await expect(page.getByText('Colloquio finito! 🎉')).toBeVisible()
  await expect(page.getByTestId('tutor-summary')).toContainText('Ottimo colloquio!')
  await expect(page.getByText('I have wrote')).toBeVisible()
  await expect(page.getByTestId('tutor-added')).toContainText('write')

  // Tutte le risposte dell'utente arrivano dal riconoscimento vocale, e il tempo è arrivato a 15+ minuti.
  const userTurns = (bodies.at(-1)?.messages ?? [])
    .filter((m) => m.role === 'user')
    .slice(1)
    .map((m) => m.content.split('\n\n')[0])
  expect(userTurns).toEqual(ANSWERS)
  expect(bodies.at(-1)?.finish).toBe(true)
  expect(bodies.at(-1)?.elapsedMinutes).toBeGreaterThanOrEqual(15)

  // Il riepilogo è salvato: dopo un ricaricamento è nello storico, e il verbo è da ripassare.
  await page.getByRole('link', { name: 'Torna al tutor' }).click()
  await page.reload()
  await expect(page.getByTestId('tutor-history')).toContainText('Ottimo colloquio!')
  await expect(page.getByTestId('tutor-history')).toContainText('1 correzioni')
  await page.goto('/allenamenti/verbi')
  await expect(page.getByText(/Da ripassare adesso: 1/)).toBeVisible()
})

test('senza configurazione il tutor spiega cosa fare; offline lo dice con gentilezza', async ({
  page,
}) => {
  await page.goto('/allenamenti/tutor')
  await expect(page.getByText('Il tutor va collegato una volta sola.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vai alle Impostazioni' })).toBeVisible()
})
