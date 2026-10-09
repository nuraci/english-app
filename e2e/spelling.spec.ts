import { expect, test, type Page } from '@playwright/test'
import { spokenToChars } from '../src/core/normalize/spelling'

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

const spokenCount = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)

async function nextSpoken(page: Page, already: number): Promise<string> {
  await expect.poll(() => spokenCount(page)).toBeGreaterThan(already)
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1) ?? '')
}

/** Cambia una lettera con una che si confonde facilmente. */
function withMistake(code: string): string {
  const swap: Record<string, string> = {
    I: 'E',
    E: 'I',
    A: 'E',
    G: 'J',
    J: 'G',
    K: 'Q',
    Q: 'K',
    Y: 'I',
    H: 'A',
    R: 'A',
    B: 'D',
    D: 'B',
    S: 'F',
    F: 'S',
    M: 'N',
    N: 'M',
    P: 'B',
    T: 'D',
    C: 'Z',
    V: 'B',
  }
  const i = [...code].findIndex((c) => swap[c])
  if (i < 0) return `X${code.slice(1)}`
  return code.slice(0, i) + swap[code[i] as string] + code.slice(i + 1)
}

test('dettato di 10 codici con correzione lettera per lettera', async ({ page }) => {
  await page.goto('/allenamenti')
  await page.getByRole('link', { name: /Spelling/ }).click()
  await page.getByRole('link', { name: 'Inizia: Dettato di codici' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dettato di codici')

  let heard = 0
  let dictations = 0
  let highlighted = 0
  for (let i = 0; i < 25; i++) {
    if (await page.getByRole('button', { name: 'Fine' }).isVisible()) break
    const spoken = await nextSpoken(page, heard)
    heard = await spokenCount(page)
    const code = spokenToChars(spoken)
    const retry = i >= 10
    const answer = !retry && i % 2 === 0 ? withMistake(code) : code
    dictations++

    await page.getByRole('textbox', { name: 'La tua risposta' }).fill(answer)
    await page.getByRole('button', { name: 'Verifica' }).click()
    const feedback = page
      .getByRole('status')
      .filter({ has: page.getByRole('button', { name: 'Continua' }) })
    if (answer === code) {
      await expect(feedback.getByTestId('spelling-diff')).toHaveCount(0)
    } else {
      // La lettera sbagliata è evidenziata e il messaggio dice quale.
      await expect(feedback.locator('[data-op="sub"]')).toHaveCount(1)
      await expect(feedback).toContainText(/Hai scritto «.», era «.»\./)
      highlighted++
    }
    await page.getByRole('button', { name: 'Continua' }).click()
  }
  expect(highlighted).toBe(5)
  expect(dictations).toBe(15) // 10 codici + 5 riproposti dopo l'errore
  await expect(page.getByText('5 su 10 al primo colpo.')).toBeVisible()
})

test('i tuoi dati: spelling del cognome, anche senza microfono', async ({ page }) => {
  await page.goto('/allenamenti/spelling')
  await page.getByLabel('Cognome').fill('Bianchi')
  await page.getByLabel('Cognome').blur()
  await page.getByRole('link', { name: 'Inizia: i tuoi dati' }).click()
  await expect(page.getByText('And how do you spell your surname?')).toBeVisible()
  await page.getByRole('button', { name: 'Non posso parlare ora' }).click()
  await page.getByRole('button', { name: 'Mostra la risposta' }).click()
  await expect(page.getByText('B · I · A · N · C · H · I')).toBeVisible()
  await page.getByRole('button', { name: 'Bene' }).click()
  await page.getByRole('button', { name: 'Continua' }).click()
  await expect(page.getByText('1 su 1 al primo colpo.')).toBeVisible()
})

test('tabella dell’alfabeto con le trappole', async ({ page }) => {
  await page.goto('/allenamenti/spelling/alfabeto')
  await expect(page.getByRole('button', { name: /Ascolta la lettera/ })).toHaveCount(26)
  await expect(page.getByText('«eich», mai «acca»')).toBeVisible()
  await page.getByRole('button', { name: 'Ascolta la lettera H' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)))
    .toBe('aitch')
})
