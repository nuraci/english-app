import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[] }
    w.__spoken = []
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push(u.text)
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10)
    }
    window.speechSynthesis.cancel = () => {}
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      const ctor = (window as unknown as Record<string, { available?: unknown } | undefined>)[name]
      if (ctor) ctor.available = () => Promise.resolve('unavailable')
    }
  })
})

const lastSpoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1))

test('5 mazzi e trappole: ogni termine si può ascoltare', async ({ page }) => {
  await page.goto('/allenamenti')
  await page.getByRole('link', { name: /Vocabolario tecnico/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vocabolario tecnico')
  await expect(page.getByRole('link', { name: /^Allenati: / })).toHaveCount(5)

  // Almeno 150 termini dei mazzi + le trappole, ognuno con il suo tasto "Ascolta".
  expect(await page.locator('button[aria-label^="Ascolta "]').count()).toBeGreaterThanOrEqual(
    150 + 24,
  )

  await page.getByText('Vedi i termini (32)').first().click()
  await page.getByRole('button', { name: 'Ascolta SMU' }).click()
  await expect.poll(() => lastSpoken(page)).toBe('S M U')
})

test('prima sessione su un mazzo', async ({ page }) => {
  await page.goto('/allenamenti/vocabolario/sessione?deck=instruments')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Strumenti')
  await expect(page.locator('section p').first()).toHaveText('oscilloscope')
  await expect.poll(() => lastSpoken(page)).toBe('oscilloscope')

  for (let i = 0; i < 20; i++) {
    if (await page.getByRole('button', { name: 'Fine' }).isVisible()) break
    const cant = page.getByRole('button', { name: 'Non posso parlare ora' })
    const textbox = page.getByRole('textbox', { name: 'La tua risposta' })
    const reveal = page.getByRole('button', { name: 'Mostra la risposta' })
    const choice = page.locator('section .grid button')
    await expect(cant.or(textbox).or(reveal).or(choice.first())).toBeVisible()
    if (await cant.isVisible()) await cant.click()
    if (await reveal.isVisible()) {
      await reveal.click()
      await page.getByRole('button', { name: 'Bene' }).click()
    } else if (await textbox.isVisible()) {
      await textbox.fill('probe')
      await page.getByRole('button', { name: 'Verifica' }).click()
    } else {
      await choice.first().click()
    }
    await page.getByRole('button', { name: 'Continua' }).click()
  }
  await expect(page.getByText(/su 10 al primo colpo/)).toBeVisible()
  await page.getByRole('button', { name: 'Fine' }).click()
  await expect(page.getByText(/5 visti su 32/).first()).toBeVisible()
})

test('trappole di pronuncia: ascolta e ripeti con la nota', async ({ page }) => {
  await page.goto('/allenamenti/vocabolario/sessione?traps=1')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trappole di pronuncia')
  await expect(page.locator('section p').first()).toHaveText('cache')
  await expect(page.getByText(/«cash», come i soldi/)).toBeVisible()
})
