import type { MessageKey } from '../i18n'
import type { IconName } from '../ui/Icon'

export type NavItem = { to: string; label: string; labelKey: MessageKey; icon: IconName }

export const navItems: NavItem[] = [
  { to: '/', label: 'Oggi', labelKey: 'nav.today', icon: 'today' },
  { to: '/allenamenti', label: 'Allenamenti', labelKey: 'nav.training', icon: 'training' },
  { to: '/progressi', label: 'Progressi', labelKey: 'nav.progress', icon: 'progress' },
  { to: '/impostazioni', label: 'Impostazioni', labelKey: 'nav.settings', icon: 'settings' },
]
