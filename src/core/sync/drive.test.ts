import { afterEach, describe, expect, it } from 'vitest'
import { AppDatabase } from '../db/db'
import { DriveClient, SYNC_FILE_NAME, SyncError, syncWithDrive } from './drive'

/** Drive finto: un solo spazio appDataFolder in memoria, come l'API REST v3. */
function fakeDrive() {
  const files = new Map<string, { name: string; content: string }>()
  let next = 1
  const calls: string[] = []
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    calls.push(`${method} ${url.pathname}`)
    const auth = (init?.headers as Record<string, string>)?.Authorization
    if (auth !== 'Bearer good-token') return new Response('{}', { status: 401 })
    if (method === 'GET' && url.pathname === '/drive/v3/files') {
      expect(url.searchParams.get('spaces')).toBe('appDataFolder')
      return Response.json({
        files: [...files].filter(([, f]) => f.name === SYNC_FILE_NAME).map(([id]) => ({ id })),
      })
    }
    if (method === 'GET' && url.searchParams.get('alt') === 'media') {
      return new Response(files.get(url.pathname.split('/').pop() as string)?.content ?? '')
    }
    if (method === 'POST' && url.pathname === '/upload/drive/v3/files') {
      const body = String(init?.body)
      expect(body).toContain('"parents":["appDataFolder"]')
      const content = body.split('\r\n').slice(-2)[0] as string
      const id = `f${next++}`
      files.set(id, { name: SYNC_FILE_NAME, content })
      return Response.json({ id })
    }
    if (method === 'PATCH') {
      files.set(url.pathname.split('/').pop() as string, {
        name: SYNC_FILE_NAME,
        content: String(init?.body),
      })
      return Response.json({})
    }
    if (method === 'DELETE') {
      files.delete(url.pathname.split('/').pop() as string)
      return new Response(null, { status: 204 })
    }
    return new Response('{}', { status: 404 })
  }) as typeof fetch
  return { files, calls, fetchFn }
}

describe('sincronizzazione con Google Drive', () => {
  const dbs: AppDatabase[] = []
  const newDb = () => {
    const db = new AppDatabase(`drive-${crypto.randomUUID()}`)
    dbs.push(db)
    return db
  }
  afterEach(async () => {
    for (const db of dbs.splice(0)) await db.delete()
  })

  it('primo dispositivo: crea il file nella cartella nascosta; il secondo lo unisce e lo aggiorna', async () => {
    const drive = fakeDrive()
    const phone = newDb()
    const pc = newDb()
    await phone.reviews.add({
      itemId: 'verbs:go',
      module: 'verbs',
      rating: 3,
      correct: true,
      reviewedAt: 1,
    })
    await pc.reviews.add({
      itemId: 'verbs:see',
      module: 'verbs',
      rating: 1,
      correct: false,
      reviewedAt: 2,
    })

    const first = await syncWithDrive(new DriveClient('good-token', drive.fetchFn), phone)
    expect(first.created).toBe(true)
    expect(drive.files.size).toBe(1)

    const second = await syncWithDrive(new DriveClient('good-token', drive.fetchFn), pc)
    expect(second.created).toBe(false)
    expect(await pc.reviews.count()).toBe(2)

    await syncWithDrive(new DriveClient('good-token', drive.fetchFn), phone)
    expect(await phone.reviews.count()).toBe(2)
    expect(drive.files.size).toBe(1)
    expect(drive.calls).toContain('PATCH /upload/drive/v3/files/f1')
  })

  it('token scaduto o revocato → errore di autorizzazione', async () => {
    const drive = fakeDrive()
    await expect(
      syncWithDrive(new DriveClient('expired', drive.fetchFn), newDb()),
    ).rejects.toMatchObject({ code: 'auth' })
  })

  it('cancellazione del file su Drive', async () => {
    const drive = fakeDrive()
    const client = new DriveClient('good-token', drive.fetchFn)
    await syncWithDrive(client, newDb())
    const id = await client.findFile()
    await client.remove(id as string)
    expect(await client.findFile()).toBeNull()
    expect(SyncError).toBeDefined()
  })
})
