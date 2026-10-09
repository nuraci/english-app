import type { CharOp } from '../core/normalize'

const base =
  'inline-flex min-w-7 flex-col items-center rounded-md px-1 py-0.5 font-mono text-xl leading-tight'

/** Descrizione a parole per i lettori di schermo: "lettera 3: hai scritto E, era I". */
function describe(ops: CharOp[]): string {
  let position = 0
  const parts: string[] = []
  for (const o of ops) {
    if (o.op !== 'extra') position++
    if (o.op === 'sub') parts.push(`lettera ${position}: hai scritto ${o.got}, era ${o.expected}`)
    if (o.op === 'missing') parts.push(`lettera ${position}: manca ${o.expected}`)
    if (o.op === 'extra') parts.push(`dopo la lettera ${position}: ${o.got} in più`)
  }
  return parts.length ? parts.join('; ') : 'tutte le lettere giuste'
}

/**
 * La soluzione lettera per lettera: verde se giusta, rossa con sotto la lettera scritta
 * se sbagliata, ambra se mancante, barrata se in più.
 */
export function SpellingDiff({ ops }: { ops: CharOp[] }) {
  return (
    <div className="mt-3">
      <p className="sr-only">{describe(ops)}</p>
      <div aria-hidden="true" className="flex flex-wrap gap-1" data-testid="spelling-diff">
        {ops.map((o, i) => {
          switch (o.op) {
            case 'ok':
              return (
                <span
                  key={i}
                  className={`${base} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100`}
                >
                  {o.char === ' ' ? '␣' : o.char}
                </span>
              )
            case 'sub':
              return (
                <span
                  key={i}
                  data-op="sub"
                  className={`${base} bg-rose-100 text-rose-900 ring-2 ring-rose-400 dark:bg-rose-900/60 dark:text-rose-100`}
                >
                  {o.expected}
                  <span className="text-xs line-through opacity-70">{o.got}</span>
                </span>
              )
            case 'missing':
              return (
                <span
                  key={i}
                  data-op="missing"
                  className={`${base} bg-amber-100 text-amber-900 underline decoration-2 ring-2 ring-amber-400 dark:bg-amber-900/60 dark:text-amber-100`}
                >
                  {o.expected}
                  <span className="text-xs opacity-70">manca</span>
                </span>
              )
            case 'extra':
              return (
                <span key={i} data-op="extra" className={`${base} text-slate-500 line-through`}>
                  {o.got}
                </span>
              )
          }
        })}
      </div>
    </div>
  )
}
