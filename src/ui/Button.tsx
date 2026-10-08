import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

const STYLES: Record<Variant, string> = {
  primary:
    'bg-teal-700 text-white hover:bg-teal-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400',
  secondary:
    'bg-teal-50 text-teal-900 ring-1 ring-teal-200 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-100 dark:ring-teal-800 dark:hover:bg-teal-900',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-xl px-4 font-semibold transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${STYLES[variant]} ${className}`}
      {...props}
    />
  )
}
