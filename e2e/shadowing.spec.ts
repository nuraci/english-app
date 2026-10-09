import { expect, test, type Page } from '@playwright/test'

/** Voce di sistema finta con coda vera: una frase alla volta, con eventi start/end. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __spoken: { text: string; volume: number; lang: string }[] }
    w.__spoken = []
    const queue: SpeechSynthesisUtterance[] = []
    let busy = false
    const next = () => {
      const u = queue.shift()
      if (!u) {
        busy = false
        return
      }
      busy = true
      u.onstart?.(new Event('start') as SpeechSynthesisEvent)
      setTimeout(() => {
        u.onend?.(new Event('end') as SpeechSynthesisEvent)
        next()
      }, 30)
    }
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      w.__spoken.push({ text: u.text, volume: u.volume, lang: u.lang })
      queue.push(u)
      if (!busy) next()
    }
    window.speechSynthesis.cancel = () => {
      queue.splice(0)
    }
  })
})

const spoken = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __spoken: { text: string; volume: number; lang: string }[] })
        .__spoken,
  )

const SRT = `1
00:00:01,000 --> 00:00:03,500
Hello, IT. Have you tried turning it off and on again?

2
00:00:04,000 --> 00:00:06,000
<i>Are you sure it's plugged in?</i>

3
00:00:06,500 --> 00:00:08,000
[PHONE RINGING]

4
00:00:08,500 --> 00:00:10,000
I'll just put this over here with the rest of the fire.
`

test('un file .srt importato diventa una sessione di shadowing', async ({ page }) => {
  await page.goto('/allenamenti')
  await page.getByRole('link', { name: /Shadowing e ascolto/ }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'The IT Crowd 1x01.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from(SRT),
  })
  await expect(
    page.getByText('Fatto! «The IT Crowd 1x01»: 3 battute pronte per lo shadowing.'),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Frase per frase: The IT Crowd 1x01' }).click()
  await expect(page.getByTestId('shadow-sentence')).toHaveText(
    'Hello, IT. Have you tried turning it off and on again?',
  )
  await expect(page.getByText('Frase 1 di 3')).toBeVisible()

  await page.getByRole('button', { name: 'Ascolta', exact: true }).click()
  await expect
    .poll(async () => (await spoken(page)).at(-1)?.text)
    .toBe('Hello, IT. Have you tried turning it off and on again?')

  // Ripeti ×3: tre ascolti, ognuno seguito da una pausa silenziosa per ripetere.
  const before = (await spoken(page)).length
  await page.getByRole('button', { name: 'Ripeti ×3' }).click()
  await expect.poll(async () => (await spoken(page)).length - before).toBe(6)
  const repeated = (await spoken(page)).slice(before)
  expect(repeated.filter((s) => s.volume > 0)).toHaveLength(3)

  await page.getByRole('button', { name: 'Successiva ›' }).click()
  await expect(page.getByTestId('shadow-sentence')).toHaveText("Are you sure it's plugged in?")

  // Il file importato resta disponibile anche dopo aver ricaricato l'app.
  await page.goto('/allenamenti/shadowing')
  await expect(page.getByRole('heading', { name: 'The IT Crowd 1x01' })).toBeVisible()
})

test('modalità auto: playlist consegnata subito alla voce di sistema, con controlli sulla schermata di blocco', async ({
  page,
}) => {
  await page.goto('/allenamenti/shadowing')
  await page.getByRole('link', { name: 'Modalità auto: Frasi salvavita' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modalità auto 🚗')
  await page.getByRole('button', { name: '1', exact: true }).click()
  await page.getByRole('button', { name: /Avvia \(14 frasi\)/ }).click()

  // Tutti i segmenti in coda subito (14 frasi × [frase, pausa, traduzione, stacco]): niente timer JavaScript
  // tra una frase e l'altra, quindi la lettura continua anche a schermo spento.
  await expect.poll(async () => (await spoken(page)).length).toBe(14 * 4)
  const all = await spoken(page)
  expect(all[0]).toMatchObject({ text: 'Could you repeat the question, please?', volume: 1 })
  expect(all[1]?.volume).toBe(0)
  expect(all[2]).toMatchObject({ text: 'Può ripetere la domanda, per favore?', lang: 'it-IT' })

  await expect(page.getByTestId('auto-sentence')).toBeVisible()
  await expect(page.getByText(/Puoi spegnere lo schermo/)).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession.metadata?.artist))
    .toBe('TechTalk Coach')

  // La frase mostrata avanza insieme alla lettura.
  await expect(page.getByText(/Frase [2-9] di 14/)).toBeVisible()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: /Avvia/ })).toBeVisible()
})
