import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db/db'
import { updateSettings } from './db/settings'
import workerCode from '../../public/reminder-sw.js?raw'

type Listener = (event: { tag?: string; waitUntil: (p: Promise<unknown>) => void }) => void

/** Carica public/reminder-sw.js in un service worker finto e restituisce il gestore "periodicsync". */
function loadWorker() {
  const listeners: Record<string, Listener> = {}
  const showNotification = vi.fn(() => Promise.resolve())
  const self = {
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
    registration: { showNotification, scope: '/' },
    clients: { openWindow: vi.fn() },
  }
  new Function('self', workerCode)(self)
  const sync = async () => {
    let work: Promise<unknown> = Promise.resolve()
    listeners.periodicsync?.({ tag: 'daily-reminder', waitUntil: (p) => (work = p) })
    await work
  }
  return { sync, showNotification }
}

describe('promemoria giornaliero (service worker)', () => {
  beforeEach(async () => {
    await db.reviews.clear()
    await db.sessions.clear()
    await updateSettings({ reminderEnabled: true, reminderHour: 19 })
  })
  afterEach(() => vi.useRealTimers())

  it('dopo l’ora scelta, se oggi non ti sei allenato, arriva la notifica', async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 9, 20, 0), toFake: ['Date'] })
    const w = loadWorker()
    await w.sync()
    expect(w.showNotification).toHaveBeenCalledWith(
      'TechTalk Coach',
      expect.objectContaining({ tag: 'daily-reminder' }),
    )
  })

  it('niente notifica se ti sei già allenato, prima dell’ora o se il promemoria è spento', async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 9, 20, 0), toFake: ['Date'] })
    await db.reviews.add({
      itemId: 'verbs:go',
      module: 'verbs',
      rating: 3,
      correct: true,
      reviewedAt: new Date(2026, 9, 9, 8).getTime(),
    })
    let w = loadWorker()
    await w.sync()
    expect(w.showNotification).not.toHaveBeenCalled()

    await db.reviews.clear()
    vi.setSystemTime(new Date(2026, 9, 9, 18, 0))
    w = loadWorker()
    await w.sync()
    expect(w.showNotification).not.toHaveBeenCalled()

    vi.setSystemTime(new Date(2026, 9, 9, 20, 0))
    await updateSettings({ reminderEnabled: false })
    w = loadWorker()
    await w.sync()
    expect(w.showNotification).not.toHaveBeenCalled()
  })
})
