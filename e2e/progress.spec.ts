import { expect, test, type Page } from '@playwright/test'

test.use({ timezoneId: 'Europe/Rome' })

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

/** Un allenamento breve: lo spelling del cognome (un esercizio, autovalutazione). */
async function trainToday(page: Page) {
  await page.goto('/allenamenti/spelling/sessione?mode=personal')
  await page.getByRole('button', { name: 'Non posso parlare ora' }).click()
  await page.getByRole('button', { name: 'Mostra la risposta' }).click()
  await page.getByRole('button', { name: 'Bene' }).click()
  await page.getByRole('button', { name: 'Continua' }).click()
  await page.getByRole('button', { name: 'Fine' }).click()
}

async function expectToday(page: Page, streak: number, xpToday: number, jollies: number) {
  await page.goto('/')
  await expect(page.getByTestId('streak')).toHaveText(`🔥 ${streak}`)
  await expect(page.getByTestId('xp-today')).toHaveText(String(xpToday))
  await expect(page.getByTestId('jollies')).toHaveText(`🃏 ${jollies}`)
}

test('7 giorni simulati: serie, jolly, XP, obiettivo settimanale e badge', async ({ page }) => {
  // Da lunedì 5 a domenica 11 ottobre 2026; giovedì 8 l'utente non si allena.
  const day = (d: number) => new Date(`2026-10-${String(d).padStart(2, '0')}T10:00:00+02:00`)

  await page.clock.setFixedTime(day(5))
  await page.goto('/allenamenti/spelling')
  await page.getByLabel('Cognome').fill('Bianchi')
  await page.getByLabel('Cognome').blur()
  await expectToday(page, 0, 0, 1)

  // Lunedì, martedì, mercoledì
  for (const [d, streak] of [
    [5, 1],
    [6, 2],
    [7, 3],
  ] as const) {
    await page.clock.setFixedTime(day(d))
    await trainToday(page)
    // 1 risposta giusta (10 XP) + sessione completata (20 XP)
    await expectToday(page, streak, 30, 1)
  }

  // Giovedì: nessun allenamento. La serie non è persa finché il giorno non finisce.
  await page.clock.setFixedTime(new Date('2026-10-08T21:00:00+02:00'))
  await expectToday(page, 3, 0, 1)
  await expect(page.getByText('Bastano 10 minuti per portare la serie a 4 giorni.')).toBeVisible()

  // Venerdì: il jolly copre giovedì, la serie continua.
  await page.clock.setFixedTime(day(9))
  await expectToday(page, 3, 0, 0)
  await trainToday(page)
  await expectToday(page, 4, 30, 0)

  for (const [d, streak] of [
    [10, 5],
    [11, 6],
  ] as const) {
    await page.clock.setFixedTime(day(d))
    await trainToday(page)
    await expectToday(page, streak, 30, 0)
  }
  await expect(page.getByTestId('week-goal')).toHaveText('Obiettivo settimanale: 6/5 giorni')
  await expect(page.getByText('Grande! Oggi la serie è salva. 🔥')).toBeVisible()

  // Progressi: XP totali, calendario con il jolly, badge.
  await page.getByRole('link', { name: 'Progressi' }).click()
  await expect(page.getByTestId('xp-total')).toHaveText('180')
  await expect(page.locator('[data-day="2026-10-08"]')).toHaveAttribute('data-state', 'jolly')
  for (const d of ['05', '06', '07', '09', '10', '11']) {
    await expect(page.locator(`[data-day="2026-10-${d}"]`)).toHaveAttribute('data-state', 'active')
  }
  const earned = page.locator('[data-testid="badges"] [data-earned="true"]')
  await expect(earned).toHaveCount(3)
  await expect(earned).toContainText(['Primo passo', 'Tre di fila', 'Obiettivo settimanale'])
})

test('la schermata Oggi propone 30 minuti in tre blocchi', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('La sessione di oggi · 30 minuti')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inizia' })).toHaveCount(3)
  await expect(page.getByText(/^1\. Lacune · 10 min/)).toBeVisible()
  await expect(page.getByText(/^2\. Ascolto e shadowing · 10 min/)).toBeVisible()
  await expect(page.getByText(/^3\. Parlato · 10 min/)).toBeVisible()
  await page.getByRole('link', { name: 'Inizia' }).first().click()
  await expect(
    page
      .getByRole('progressbar', { name: 'Avanzamento della sessione' })
      .or(page.getByRole('button', { name: 'Iniziamo' })),
  ).toBeVisible()
})
