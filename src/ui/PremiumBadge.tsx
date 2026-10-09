import { useSettings } from '../core/db/settings'

/** Etichetta per le funzioni premium: durante la beta sono gratis. */
export function PremiumBadge() {
  const { plan } = useSettings()
  return (
    <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
      Premium{plan === 'beta' ? ' · gratis in beta' : ''}
    </span>
  )
}
