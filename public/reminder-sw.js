/* Promemoria giornaliero (Periodic Background Sync, solo dove supportato: Chrome Android, app installata).
 * Gira nel service worker: legge impostazioni e attività di oggi da IndexedDB e, se è l'ora e non ti sei
 * ancora allenato, mostra una notifica gentile. Nessun dato lascia il dispositivo. */
const DB_NAME = 'techtalk-coach'
const TAG = 'daily-reminder'

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function shouldRemind() {
  const db = await request(indexedDB.open(DB_NAME))
  try {
    const tx = db.transaction(['settings', 'reviews', 'sessions'], 'readonly')
    const enabled = (await request(tx.objectStore('settings').get('reminderEnabled')))?.value === true
    const hour = (await request(tx.objectStore('settings').get('reminderHour')))?.value ?? 19
    const now = new Date()
    if (!enabled || now.getHours() < hour) return false
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const range = IDBKeyRange.lowerBound(startOfDay)
    const reviews = await request(tx.objectStore('reviews').index('reviewedAt').count(range))
    const sessions = await request(tx.objectStore('sessions').index('startedAt').count(range))
    return reviews + sessions === 0
  } finally {
    db.close()
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== TAG) return
  event.waitUntil(
    shouldRemind().then((remind) => {
      if (!remind) return undefined
      return self.registration.showNotification('TechTalk Coach', {
        body: 'Dieci minuti di inglese oggi? La tua serie ti aspetta 🔥',
        icon: 'pwa-192x192.png',
        badge: 'pwa-64x64.png',
        tag: TAG,
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(self.registration.scope))
})
