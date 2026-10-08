import { expect, test, type Page } from '@playwright/test'

/** Risponde a qualsiasi esercizio: autovalutazione, scelta o scrittura. */
async function answerCurrent(page: Page, typed: string) {
  const reveal = page.getByRole('button', { name: 'Mostra la risposta' })
  const textbox = page.getByRole('textbox', { name: 'La tua risposta' })
  const listen = page.getByText('Ascolta: quale forma hai sentito?')
  await expect(reveal.or(textbox).or(listen).first()).toBeVisible()

  if (await reveal.isVisible()) {
    await reveal.click()
    await page.getByRole('button', { name: 'Bene' }).click()
  } else if (await textbox.isVisible()) {
    await textbox.fill(typed)
    await page.getByRole('button', { name: 'Verifica' }).click()
  } else {
    await page.locator('section button[lang="en"]').first().click()
  }
  await page.getByRole('button', { name: 'Continua' }).click()
}

test('prima sessione di verbi: gruppo speciale, poi i progressi si aggiornano', async ({
  page,
}) => {
  await page.goto('/allenamenti')
  await page.getByRole('link', { name: /Verbi irregolari/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verbi irregolari')
  await expect(page.getByText('I verbi speciali')).toBeVisible()
  await expect(page.getByText('Prossimi verbi: be, do, go, come, become')).toBeVisible()

  await page.getByRole('link', { name: /Inizia la sessione/ }).click()
  await expect(page.getByText('10 esercizi')).toBeVisible()
  await page.getByRole('button', { name: 'Iniziamo' }).click()

  // Primo esercizio: flashcard del verbo più frequente.
  await expect(page.getByText('be — essere')).toBeVisible()

  for (let i = 0; i < 30; i++) {
    if (await page.getByRole('button', { name: 'Fine' }).isVisible()) break
    await answerCurrent(page, 'xyz')
  }
  await expect(page.getByText(/su \d+ al primo colpo/)).toBeVisible()
  await expect(page.getByText('Gli errori li rivedrai presto')).toBeVisible()
  await page.getByRole('button', { name: 'Fine' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verbi irregolari')
  await expect(page.getByText(/5 visti su 50/)).toBeVisible()
})

test('gli errori vengono spiegati e riproposti una volta a fine sessione', async ({ page }) => {
  await page.goto('/allenamenti/verbi/sessione')
  await page.getByRole('button', { name: 'Iniziamo' }).click()
  let typed = 0
  for (let i = 0; i < 30; i++) {
    if (await page.getByRole('button', { name: 'Fine' }).isVisible()) break
    if (await page.getByRole('textbox', { name: 'La tua risposta' }).isVisible()) typed++
    await answerCurrent(page, 'xyz')
    await expect(page.locator('body')).not.toContainText('Sbagliato')
  }
  // 5 esercizi scritti, tutti sbagliati, ciascuno riproposto una volta.
  expect(typed).toBe(10)
  await expect(page.getByText('5 su 10 al primo colpo.')).toBeVisible()
})
