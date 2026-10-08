import type { ReactNode } from 'react'

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      {children}
    </div>
  )
}
