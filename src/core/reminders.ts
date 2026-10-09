/** Promemoria giornaliero: notifica in background dove il browser lo permette. */

export const REMINDER_TAG = 'daily-reminder'

export type ReminderStatus = 'background' | 'unsupported' | 'denied'

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>
    unregister: (tag: string) => Promise<void>
  }
}

/**
 * Chiede il permesso per le notifiche e registra il controllo periodico.
 * Chrome lo concede solo all'app installata e decide lui la frequenza (in base all'uso).
 */
export async function enableReminders(): Promise<ReminderStatus> {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  try {
    const registration = (await navigator.serviceWorker.ready) as PeriodicSyncRegistration
    if (!registration.periodicSync) return 'unsupported'
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    })
    if (status.state !== 'granted') return 'unsupported'
    await registration.periodicSync.register(REMINDER_TAG, { minInterval: 12 * 60 * 60 * 1000 })
    return 'background'
  } catch {
    return 'unsupported'
  }
}

export async function disableReminders(): Promise<void> {
  try {
    const registration = (await navigator.serviceWorker.ready) as PeriodicSyncRegistration
    await registration.periodicSync?.unregister(REMINDER_TAG)
  } catch {
    // niente da fare
  }
}
