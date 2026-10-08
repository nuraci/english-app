import { Icon } from './Icon'
import { useOnlineStatus } from './useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-amber-100 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
    >
      <Icon name="offline" className="size-5 shrink-0" />
      <span>Sei offline: puoi allenarti lo stesso, i progressi restano sul telefono.</span>
    </div>
  )
}
