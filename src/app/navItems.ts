import type { IconName } from '../ui/Icon'

export type NavItem = { to: string; label: string; icon: IconName }

export const navItems: NavItem[] = [
  { to: '/', label: 'Oggi', icon: 'today' },
  { to: '/allenamenti', label: 'Allenamenti', icon: 'training' },
  { to: '/progressi', label: 'Progressi', icon: 'progress' },
  { to: '/impostazioni', label: 'Impostazioni', icon: 'settings' },
]
