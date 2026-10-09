import { expect, test } from '@playwright/test'

test('la bottom navigation porta a tutte le schermate', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oggi')
  const nav = page.getByRole('navigation', { name: 'Navigazione principale' })
  for (const label of ['Allenamenti', 'Progressi', 'Impostazioni', 'Oggi']) {
    await nav.getByRole('link', { name: label }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(label)
  }
})

test('i tasti della navigazione sono almeno 44px', async ({ page }) => {
  await page.goto('/')
  const links = page.getByRole('navigation').getByRole('link')
  for (const link of await links.all()) {
    const box = await link.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }
})

test('niente scroll orizzontale a 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})

test('il manifest è valido per l’installazione', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const res = await request.get(href ?? '')
  const manifest = await res.json()
  expect(manifest.name).toBe('TechTalk Coach')
  expect(manifest.display).toBe('standalone')
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toContain('192x192')
  expect(sizes).toContain('512x512')
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})

test('funziona offline dopo la prima visita (modalità aereo)', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // Al primo caricamento la pagina non è ancora controllata dal SW: ricarichiamo.
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await context.setOffline(true)
  await page.goto('/progressi')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Progressi')
  await expect(page.getByRole('status')).toContainText('Sei offline')
  await context.setOffline(false)
})

test('le impostazioni mostrano versione e autori', async ({ page }) => {
  await page.goto('/impostazioni')
  await expect(page.getByTestId('credits')).toContainText('Nunzio Raciti')
  await expect(page.getByTestId('credits')).toContainText('con Claude (Anthropic)')
})
