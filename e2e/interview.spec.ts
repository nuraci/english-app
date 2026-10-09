import { expect, test } from '@playwright/test'

/** Voce e riconoscimento finti: ogni risposta "detta" diventa una trascrizione. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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
        n++
        const text = `Answer ${n}: I write the test plan, then I check the specification and the corner cases.`
        setTimeout(
          () =>
            this.onresult?.({
              resultIndex: 0,
              results: [Object.assign([{ transcript: text }], { isFinal: true })],
            }),
          50,
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
  })
})

test('prova completa di 10 domande: trascrizioni e audio salvati e riascoltabili', async ({
  page,
}) => {
  await page.goto('/allenamenti')
  await page.getByRole('link', { name: /Simulazione di colloquio/ }).click()
  await page.getByRole('link', { name: 'Inizia la prova' }).click()
  await expect(page.getByText('Domanda 1 di 10')).toBeVisible()

  for (let i = 1; i <= 10; i++) {
    await expect(page.getByText(`Domanda ${i} di 10`)).toBeVisible()
    if (i === 1) {
      await page.getByRole('button', { name: 'Mostra il testo della domanda' }).click()
      await expect(page.getByText('Tell me about yourself.')).toBeVisible()
    }
    await page.getByRole('button', { name: 'Rispondi' }).click()
    await expect(page.getByText(/I write the test plan/)).toBeVisible()
    await page.getByRole('button', { name: 'Ho finito' }).click()

    await expect(page.getByTestId('transcript')).toContainText('corner cases')
    await expect(
      page.getByText(/Parole chiave usate|Nessuna parola chiave riconosciuta/),
    ).toBeVisible()
    await expect(page.getByLabel('Riascolta la tua risposta')).toBeVisible()
    await page.getByLabel('Ero chiaro e in ordine (inizio, sviluppo, fine)').check()
    await page.getByRole('button', { name: i < 10 ? 'Prossima' : 'Fine' }).click()
  }

  await expect(page.getByText('Colloquio completato!')).toBeVisible()
  await expect(page.getByText('Do you have any questions for us?')).toBeVisible()
  await page.getByRole('link', { name: 'Riascolta le tue risposte' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le tue prove')
  await expect(page.getByText('10 risposte')).toBeVisible()
  await page.getByText('Vedi e riascolta').click()
  await expect(page.getByText(/I write the test plan/)).toHaveCount(10)
  await expect(page.getByLabel('Riascolta la risposta')).toHaveCount(10)

  // Dopo un ricaricamento è ancora tutto lì: è salvato sul dispositivo.
  await page.reload()
  await page.getByText('Vedi e riascolta').click()
  await expect(page.getByText(/Answer \d+:/)).toHaveCount(10)
})

test('costruttore di Tell me about yourself e shadowing', async ({ page }) => {
  await page.goto('/allenamenti/colloquio/tell-me')
  await page
    .getByRole('button', { name: "+ I'm a validation engineer with … years of experience." })
    .click()
  await page.getByLabel('Chi sei').fill("I'm a validation engineer with five years of experience.")
  await page
    .getByLabel('La tua esperienza')
    .fill('I validate microcontrollers. I automate the tests with Python.')
  await page.getByLabel('La tua esperienza').blur()
  await expect(page.getByText('La tua presentazione')).toBeVisible()
  await page.getByRole('button', { name: 'Salva tra le tue risposte' }).click()
  await expect(page.getByRole('button', { name: 'Salvata tra le tue risposte ✓' })).toBeVisible()
  await page.getByRole('button', { name: 'Shadowing frase per frase' }).click()
  await expect(page.getByText(/Ascolta…|Ora ripeti tu!/)).toBeVisible()

  await page.goto('/allenamenti/colloquio/risposte')
  await expect(page.getByRole('link', { name: /Tell me about yourself\. preparata/ })).toBeVisible()
})

test('editor delle risposte con risposta modello', async ({ page }) => {
  await page.goto('/allenamenti/colloquio/risposte/weakness')
  await page.getByRole('button', { name: 'Parti dalla risposta modello' }).click()
  await expect(page.getByLabel('La tua risposta (in inglese)')).toHaveValue(/spoken English/)
  await page.getByRole('button', { name: 'Salva' }).click()
  await expect(page.getByRole('button', { name: 'Salvata ✓' })).toBeVisible()
})

test('frasi salvavita: ascolta e ripeti', async ({ page }) => {
  await page.goto('/allenamenti/colloquio/frasi')
  await expect(page.getByText('Could you repeat the question, please?')).toBeVisible()
  await page.getByRole('link', { name: 'Allenati: ascolta e ripeti' }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Frasi salvavita')
  await expect(page.locator('section p').first()).toHaveText(
    'Could you repeat the question, please?',
  )
})
