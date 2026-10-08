import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Chromium headless va in crash su SpeechRecognition.available() (manca il servizio on-device):
  // lo sostituiamo con una risposta fissa.
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, { available?: unknown } | undefined>
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      const ctor = w[name]
      if (ctor) ctor.available = () => Promise.resolve('unavailable')
    }
  })
})

test('la pagina di prova valuta le risposte con feedback incoraggiante', async ({ page }) => {
  await page.goto('/impostazioni')
  await page.getByRole('link', { name: /Prova voce e microfono/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prova voce e microfono')
  await expect(page.getByRole('button', { name: 'Leggi' })).toBeVisible()

  const answer = page.getByRole('textbox', { name: 'La tua risposta' })
  const feedback = page
    .getByRole('status')
    .filter({ hasText: /Quasi|Perfetto|Ottimo|Esatto|Bravo|Giusto|Non ancora/ })

  // 1. Ascolta e scrivi: errore tipico -teen / -ty
  await answer.fill('30')
  await page.getByRole('button', { name: 'Verifica' }).click()
  await expect(feedback).toContainText('Hai scritto «thirty», era «thirteen».')
  await expect(feedback).toContainText('thir-TEEN')
  await page.getByRole('button', { name: 'Continua' }).click()

  // 2. Completa la frase
  await answer.fill('Ran')
  await page.getByRole('button', { name: 'Verifica' }).click()
  await expect(feedback).not.toContainText('Hai scritto')
  await page.getByRole('button', { name: 'Continua' }).click()

  // 3. Scelta multipla
  await page.getByRole('button', { name: 'forty-seven kilo-ohms' }).click()
  await page.getByRole('button', { name: 'Continua' }).click()

  // 4. Parlato: senza microfono si passa alla scrittura
  await page.getByRole('button', { name: 'Non posso parlare ora' }).click()
  await answer.fill('I wrote the test firmware')
  await page.getByRole('button', { name: 'Verifica' }).click()
  await page.getByRole('button', { name: 'Continua' }).click()

  // 5. Autovalutazione
  await page.getByRole('button', { name: 'Mostra la risposta' }).click()
  await expect(page.getByText('Could you repeat the question, please?').first()).toBeVisible()
  await page.getByRole('button', { name: 'Bene' }).click()
  await page.getByRole('button', { name: 'Continua' }).click()

  await expect(page.getByText('Finito!')).toBeVisible()
  await expect(page.getByText('4 su 5 al primo colpo.')).toBeVisible()
  // Solo l'esercizio sbagliato torna subito da ripassare.
  await expect(page.getByText(/Da ripassare adesso \(SRS\): \d/)).toBeVisible()
})

test('le impostazioni della voce si salvano', async ({ page }) => {
  await page.goto('/impostazioni')
  const gb = page.getByRole('button', { name: /Britannico/ })
  await gb.click()
  await expect(gb).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.getByRole('button', { name: /Britannico/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
