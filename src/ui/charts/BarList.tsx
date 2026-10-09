export type BarItem = { key: string; label: string; value: number; detail: string }

/** Barre orizzontali di una sola serie, con il valore in fondo alla barra (testo in colore neutro). */
export function BarList({ items, caption }: { items: BarItem[]; caption: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-3" aria-label={caption}>
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex justify-between gap-2 text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-slate-600 tabular-nums dark:text-slate-300">{item.detail}</span>
          </div>
          <div className="mt-1 h-3 w-full" title={`${item.label}: ${item.detail}`}>
            <div
              className="h-3 rounded-r bg-[#0d9488]"
              style={{ width: `${item.value ? Math.max(2, (item.value / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
