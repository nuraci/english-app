import { useState } from 'react'
import { updateSettings, useSettings } from '../core/db/settings'
import { disableReminders, enableReminders, type ReminderStatus } from '../core/reminders'
import { Button } from './Button'

const STATUS_TEXT: Record<ReminderStatus, string> = {
  background: 'Promemoria attivo: se a quell’ora non ti sei ancora allenato, arriva una notifica.',
  unsupported:
    'Su questo telefono le notifiche in background non sono disponibili (serve Chrome con l’app installata). Te lo ricorderà la schermata Oggi.',
  denied: 'Le notifiche sono bloccate: puoi attivarle dalle impostazioni del browser.',
}

/** Obiettivo settimanale e promemoria giornaliero. */
export function GoalSettings() {
  const settings = useSettings()
  const [status, setStatus] = useState<ReminderStatus | null>(null)

  const toggleReminder = async (on: boolean) => {
    await updateSettings({ reminderEnabled: on })
    if (on) setStatus(await enableReminders())
    else {
      await disableReminders()
      setStatus(null)
    }
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 font-semibold">Obiettivo settimanale (giorni)</legend>
        <div className="grid grid-cols-5 gap-2">
          {[3, 4, 5, 6, 7].map((n) => (
            <Button
              key={n}
              variant={settings.weeklyGoalDays === n ? 'primary' : 'secondary'}
              aria-pressed={settings.weeklyGoalDays === n}
              onClick={() => void updateSettings({ weeklyGoalDays: n })}
            >
              {n}
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-12 items-center justify-between gap-3">
        <span className="font-semibold">Promemoria giornaliero</span>
        <input
          type="checkbox"
          className="size-6 accent-teal-700"
          checked={settings.reminderEnabled}
          onChange={(e) => void toggleReminder(e.target.checked)}
        />
      </label>
      {settings.reminderEnabled && (
        <label className="block">
          <span className="mb-1 block text-sm">Ora del promemoria</span>
          <select
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            value={settings.reminderHour}
            onChange={(e) => void updateSettings({ reminderHour: Number(e.target.value) })}
          >
            {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </label>
      )}
      {status && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          {STATUS_TEXT[status]}
        </p>
      )}
    </div>
  )
}
