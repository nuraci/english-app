import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10)
    }
    window.speechSynthesis.cancel = () => {}
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      const ctor = (window as unknown as Record<string, { available?: unknown } | undefined>)[name]
      if (ctor) ctor.available = () => Promise.resolve('unavailable')
    }
  })
})

async function answerAny(page: Page) {
  const textbox = page.getByRole('textbox', { name: 'La tua risposta' })
  const choice = page.locator('section .grid button')
  const done = page.getByTestId('level-overall')
  await expect(textbox.or(choice.first()).or(done)).toBeVisible()
  if (await done.isVisible()) return
  if (await textbox.isVisible()) {
    await textbox.fill('42')
    await page.getByRole('button', { name: 'Verifica' }).click()
  } else {
    await choice.first().click()
  }
  await page.getByRole('button', { name: 'Continua' }).click()
}

test('onboarding: test di livello da 16 domande e punto di partenza', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Benvenuto! 👋')).toBeVisible()
  await page.getByRole('link', { name: 'Fai il test di livello' }).click()
  await page.getByRole('button', { name: '🇬🇧 Britannico' }).click()
  await page.getByRole('button', { name: 'Fai il test di livello (5 minuti)' }).click()
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId('level-overall').isVisible()) break
    await answerAny(page)
  }
  await expect(page.getByTestId('level-overall')).toHaveText(/^(A2|B1|B2)$/)
  for (const area of ['Verbi irregolari', 'Numeri in ascolto', 'Spelling', 'Vocabolario tecnico']) {
    await expect(page.getByText(area, { exact: true })).toBeVisible()
  }
  await expect(page.getByText(/Da dove cominciare/)).toBeVisible()
  await page.getByRole('link', { name: 'Vai alla schermata Oggi' }).click()
  await expect(page.getByText('Benvenuto! 👋')).toHaveCount(0)
})

test('i tuoi dati: esporta, reimporta e cancella', async ({ page }) => {
  await page.goto('/allenamenti/spelling')
  await page.getByLabel('Cognome').fill('Bianchi')
  await page.getByLabel('Cognome').blur()

  await page.goto('/impostazioni')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Esporta i miei dati' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^techtalk-coach-\d{4}-\d{2}-\d{2}\.json$/)
  const file = readFileSync((await download.path()) as string, 'utf8')
  expect(JSON.parse(file)).toMatchObject({ format: 'techtalk-coach-backup' })

  // Cancella tutto (due conferme), poi reimporta il backup.
  page.on('dialog', (d) => void d.accept())
  const wiped = page.waitForEvent('load')
  await page.getByRole('button', { name: 'Cancella tutti i miei dati' }).click()
  await wiped
  await page.goto('/allenamenti/spelling')
  await expect(page.getByLabel('Cognome')).toHaveValue('')

  await page.goto('/impostazioni')
  const imported = page.waitForEvent('load')
  await page
    .locator('input[type="file"][accept*="json"]')
    .setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(file) })
  await imported
  await page.goto('/allenamenti/spelling')
  await expect(page.getByLabel('Cognome')).toHaveValue('Bianchi')
})

test('pacchetto Embedded e IoT: premium, gratis in beta, aggiunge i mazzi', async ({ page }) => {
  await page.goto('/allenamenti/vocabolario')
  await expect(page.getByRole('link', { name: /^Allenati: / })).toHaveCount(5)
  await page.goto('/impostazioni')
  await expect(page.getByText('Beta: tutto incluso, gratis')).toBeVisible()
  await expect(page.getByText('Premium · gratis in beta').first()).toBeVisible()
  await page.getByLabel('Pacchetto Embedded e IoT').click()
  await expect(page.getByLabel('Pacchetto Embedded e IoT')).toBeChecked()
  await page.goto('/allenamenti/vocabolario')
  await expect(page.getByRole('link', { name: /^Allenati: / })).toHaveCount(7)
  await expect(page.getByRole('heading', { name: /Radio e Bluetooth/ })).toBeVisible()
})

test('informativa sulla privacy', async ({ page }) => {
  await page.goto('/impostazioni')
  await page.getByRole('link', { name: 'Informativa sulla privacy' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy')
  await expect(page.getByText(/restano sul tuo telefono/)).toBeVisible()
})

test('pagina di presentazione con lista d’attesa', async ({ page }) => {
  const original = readFileSync('public/landing.html', 'utf8')
  await page.route('**/landing.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: original.replace('data-endpoint=""', 'data-endpoint="https://tutor.test"'),
    }),
  )
  let received: unknown = null
  await page.route('https://tutor.test/api/waitlist', async (route) => {
    received = route.request().postDataJSON()
    await route.fulfill({ json: { ok: true } })
  })
  await page.goto('/landing.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'L’inglese per i colloqui tecnici degli ingegneri.',
  )
  await page.getByLabel('Email', { exact: true }).fill('mario.rossi@example.com')
  await page.getByLabel('Ruolo (facoltativo)').fill('Validation engineer')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Iscrivimi' }).click()
  await expect(page.getByText(/Grazie! Ti scriveremo/)).toBeVisible()
  expect(received).toEqual({
    email: 'mario.rossi@example.com',
    role: 'Validation engineer',
    consent: true,
  })
})
