import { useState } from 'react'

export type Column = { key: string; label: string; value: number; tooltip: string }

const HEIGHT = 120
const GAP = 2

/**
 * Colonne di una sola serie (nessuna legenda: il titolo dice cosa si vede).
 * Colonne sottili con l'estremità arrotondata, valore al passaggio del dito, tabella per l'accessibilità.
 */
export function ColumnChart({
  data,
  caption,
  unit,
}: {
  data: Column[]
  caption: string
  unit: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = 100 / Math.max(1, data.length)
  const active = hover !== null ? data[hover] : undefined

  return (
    <figure className="m-0">
      <div className="relative">
        <p className="mb-1 h-5 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {active ? active.tooltip : ' '}
        </p>
        <svg
          viewBox={`0 0 100 ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-32 w-full"
          role="img"
          aria-label={caption}
          onPointerLeave={() => setHover(null)}
        >
          <line
            x1="0"
            y1={HEIGHT - 0.5}
            x2="100"
            y2={HEIGHT - 0.5}
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((d, i) => {
            const h = d.value ? Math.max(3, (d.value / max) * (HEIGHT - 8)) : 0
            const width = Math.min(slot - GAP * 0.4, 6)
            const x = i * slot + (slot - width) / 2
            return (
              <g key={d.key} onPointerEnter={() => setHover(i)} onClick={() => setHover(i)}>
                {/* Area di tocco più grande della colonna */}
                <rect x={i * slot} y={0} width={slot} height={HEIGHT} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M${x},${HEIGHT} v${-(h - 1.5)} q0,-1.5 1.5,-1.5 h${width - 3} q1.5,0 1.5,1.5 v${h - 1.5} z`}
                    fill="#0d9488"
                    opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                )}
              </g>
            )
          })}
        </svg>
        <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{data[0]?.label}</span>
          <span>{data.at(-1)?.label}</span>
        </div>
      </div>
      <details className="mt-2 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-slate-500">
          Vedi come tabella
        </summary>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="font-semibold">Giorno</th>
              <th className="text-right font-semibold">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td className="text-right tabular-nums">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
