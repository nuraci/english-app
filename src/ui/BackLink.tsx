import { Link } from 'react-router-dom'
import { Icon } from './Icon'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="-mt-4 inline-flex min-h-11 items-center gap-1 text-teal-700 dark:text-teal-300"
    >
      <Icon name="back" className="size-5" /> {label}
    </Link>
  )
}
