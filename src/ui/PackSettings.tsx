import { updateSettings, useSettings } from '../core/db/settings'
import { BASE_PACK, packs } from '../core/packs'

/** Pacchetti di contenuti di settore. */
export function PackSettings() {
  const settings = useSettings()
  const toggle = (id: string, on: boolean) => {
    const next = on
      ? [...new Set([...settings.activePacks, id])]
      : settings.activePacks.filter((p) => p !== id)
    void updateSettings({ activePacks: next })
  }
  return (
    <div className="space-y-3">
      {packs.map((p) => {
        const base = p.id === BASE_PACK
        return (
          <label key={p.id} className="flex items-start justify-between gap-3">
            <span>
              <span className="font-semibold">{p.name}</span>
              <span className="block text-sm text-slate-600 dark:text-slate-300">
                {p.description}
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 size-6 shrink-0 accent-teal-700"
              checked={base || settings.activePacks.includes(p.id)}
              disabled={base}
              onChange={(e) => toggle(p.id, e.target.checked)}
              aria-label={`Pacchetto ${p.name}`}
            />
          </label>
        )
      })}
    </div>
  )
}
