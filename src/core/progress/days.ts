/** Chiave del giorno in ora locale: "2026-10-09". */
export function dayKey(date: Date | number): string {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseDayKey(key: string): Date {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

/** Lunedì della settimana del giorno dato. */
export function weekStart(key: string): string {
  const d = parseDayKey(key)
  const offset = (d.getDay() + 6) % 7
  return addDays(key, -offset)
}

/** Tutti i giorni da `from` a `to` compresi. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
