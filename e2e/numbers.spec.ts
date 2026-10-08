import { expect, test, type Page } from '@playwright/test'

/** Intercetta la sintesi vocale: il test "sente" cosa legge l'app. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: string[] }
    w.__spoken = []
    const synth = window.speechSynthesis
    synth.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push(u.text)
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10)
    }
    synth.cancel = () => {}
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      const ctor = (window as unknown as Record<string, { available?: unknown } | undefined>)[name]
      if (ctor) ctor.available = () => Promise.resolve('unavailable')
    }
  })
})

const CONFUSE: Record<string, string> = {
  thirteen: '30',
  fourteen: '40',
  fifteen: '50',
  sixteen: '60',
  seventeen: '70',
  eighteen: '80',
  nineteen: '90',
  thirty: '13',
  forty: '14',
  fifty: '15',
  sixty: '16',
  seventy: '17',
  eighty: '18',
  ninety: '19',
}

/** Aspetta una lettura nuova (dopo le `already` già viste) e la restituisce. */
async function nextSpoken(page: Page, already: number): Promise<string> {
  const count = () =>
    page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)
  await expect.poll(count).toBeGreaterThan(already)
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1) ?? '')
}

const spokenCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)

test('i 7 livelli sono giocabili', async ({ page }) => {
  await page.goto('/allenamenti')
  await page.getByRole('link', { name: /Numeri e misure/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Numeri e misure')
  await expect(page.getByRole('link', { name: /^Allenati: livello/ })).toHaveCount(7)

  for (const level of [1, 5, 7]) {
    await page.goto(`/allenamenti/numeri/sessione?level=${level}`)
    await expect(
      page.getByRole('progressbar', { name: 'Avanzamento della sessione' }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('textbox', { name: 'La tua risposta' })
        .or(page.getByRole('button', { name: 'Tocca e parla' })),
    ).toBeVisible()
  }
})

test('errore -teen/-ty: feedback mirato, statistiche e allenamento dedicato', async ({ page }) => {
  await page.goto('/allenamenti/numeri/sessione?focus=teen-ty')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('-teen / -ty')

  let mistakes = 0
  let heard = 0
  for (let i = 0; i < 40; i++) {
    if (await page.getByRole('button', { name: 'Fine' }).isVisible()) break
    const textbox = page.getByRole('textbox', { name: 'La tua risposta' })
    const cantSpeak = page.getByRole('button', { name: 'Non posso parlare ora' })
    await expect(textbox.or(cantSpeak)).toBeVisible()

    if (await textbox.isVisible()) {
      const spoken = await nextSpoken(page, heard)
      heard = await spokenCount(page)
      const wrong = CONFUSE[spoken]
      expect(wrong, `numero letto: ${spoken}`).toBeDefined()
      await textbox.fill(wrong as string)
      await page.getByRole('button', { name: 'Verifica' }).click()
      await expect(page.getByText('Quasi!')).toBeVisible()
      await expect(page.getByText(/Trappola -teen\/-ty/)).toBeVisible()
      mistakes++
    } else {
      await cantSpeak.click()
      await page.getByRole('button', { name: 'Mostra la risposta' }).click()
      await page.getByRole('button', { name: 'Bene' }).click()
    }
    await page.getByRole('button', { name: 'Continua' }).click()
  }
  expect(mistakes).toBeGreaterThanOrEqual(3)
  await page.getByRole('button', { name: 'Fine' }).click()

  await expect(page.getByText('I tuoi errori ricorrenti')).toBeVisible()
  await expect(page.getByText(/-teen \/ -ty \(13 o 30\?\)/)).toBeVisible()
  await expect(page.getByText(/hai scritto «\d+», era «\d+»/).first()).toBeVisible()
  await page.getByRole('link', { name: 'Allenamento mirato' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('-teen / -ty')
})

test('la velocità crescente si salva', async ({ page }) => {
  await page.goto('/allenamenti/numeri')
  await page.getByRole('button', { name: /Crescente/ }).click()
  await expect(page.getByRole('button', { name: /Crescente/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('link', { name: /^Allenati: livello 1/ })).toHaveAttribute(
    'href',
    /speed=ramp/,
  )
})
