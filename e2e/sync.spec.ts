import { expect, test, type BrowserContext, type Route } from '@playwright/test'

/** Google Drive simulato, condiviso tra i due "dispositivi" del test. */
const drive = new Map<string, string>()

async function asDevice(context: BrowserContext) {
  await context.addInitScript(() => {
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 10)
    }
    // Google Identity Services finto: concede subito un token.
    ;(window as unknown as { google: unknown }).google = {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: { scope: string; callback: (r: unknown) => void }) => ({
            requestAccessToken: () => {
              ;(window as unknown as { __scopes: string[] }).__scopes = [cfg.scope]
              setTimeout(() => cfg.callback({ access_token: 'good-token', expires_in: 3600 }), 0)
            },
          }),
          revoke: () => {},
        },
      },
    }
  })
  await context.route('https://www.googleapis.com/**', async (route: Route) => {
    const req = route.request()
    expect(req.headers()['authorization']).toBe('Bearer good-token')
    const url = new URL(req.url())
    const method = req.method()
    if (method === 'GET' && url.pathname === '/drive/v3/files') {
      expect(url.searchParams.get('spaces')).toBe('appDataFolder')
      return route.fulfill({ json: { files: [...drive.keys()].map((id) => ({ id })) } })
    }
    if (method === 'GET')
      return route.fulfill({ body: drive.get(url.pathname.split('/').pop() as string) ?? '' })
    if (method === 'POST') {
      const body = req.postData() ?? ''
      expect(body).toContain('"parents":["appDataFolder"]')
      drive.set('file1', body.split('\r\n').slice(-2)[0] as string)
      return route.fulfill({ json: { id: 'file1' } })
    }
    if (method === 'PATCH') {
      drive.set(url.pathname.split('/').pop() as string, req.postData() ?? '')
      return route.fulfill({ json: {} })
    }
    return route.fulfill({ status: 404, json: {} })
  })
}

test('telefono e PC condividono i progressi tramite Google Drive', async ({ browser }) => {
  drive.clear()
  const phoneCtx = await browser.newContext()
  const pcCtx = await browser.newContext()
  await asDevice(phoneCtx)
  await asDevice(pcCtx)
  const phone = await phoneCtx.newPage()
  const pc = await pcCtx.newPage()

  // Sul telefono: un dato e il collegamento a Drive.
  await phone.goto('/allenamenti/spelling')
  await phone.getByLabel('Cognome').fill('Bianchi')
  await phone.getByLabel('Cognome').blur()
  await phone.goto('/impostazioni')
  await phone.getByRole('button', { name: 'Collega Google Drive' }).click()
  await expect(phone.getByText('Collegato e sincronizzato ✓')).toBeVisible()
  expect(
    await phone.evaluate(() => (window as unknown as { __scopes: string[] }).__scopes),
  ).toEqual(['https://www.googleapis.com/auth/drive.appdata'])
  expect(drive.size).toBe(1)

  // Sul PC: collegamento, e il dato del telefono arriva.
  await pc.goto('/impostazioni')
  await pc.getByRole('button', { name: 'Collega Google Drive' }).click()
  await expect(pc.getByText('Collegato e sincronizzato ✓')).toBeVisible()
  await pc.goto('/allenamenti/spelling')
  await expect(pc.getByLabel('Cognome')).toHaveValue('Bianchi')

  // Sul PC cambio l'accento; il telefono lo riceve con "Sincronizza ora".
  await pc.goto('/impostazioni')
  await pc.getByRole('button', { name: /Americano/ }).click()
  await expect(pc.getByRole('button', { name: /Americano/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await pc.getByRole('button', { name: 'Sincronizza ora' }).click()
  await expect(pc.getByText('Sincronizzato ✓')).toBeVisible()

  await phone.reload()
  await phone.getByRole('button', { name: 'Sincronizza ora' }).click()
  await expect(phone.getByText('Sincronizzato ✓')).toBeVisible()
  await expect(phone.getByRole('button', { name: /Americano/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(phone.getByTestId('last-sync')).not.toContainText('mai')

  await phoneCtx.close()
  await pcCtx.close()
})
