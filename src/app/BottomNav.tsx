import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { useT } from '../i18n'
import { navItems } from './navItems'

export function BottomNav() {
  const t = useT()
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.7rem] font-medium tracking-tight transition-colors ${
                  isActive
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon name={item.icon} className="size-6" />
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
