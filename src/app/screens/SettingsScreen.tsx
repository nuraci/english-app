import { Link } from 'react-router-dom'
import { Card, Screen } from '../../ui/Screen'
import { useOnlineStatus } from '../../ui/useOnlineStatus'
import { VoiceSettings } from '../../ui/VoiceSettings'
import { GoalSettings } from '../../ui/GoalSettings'

export function SettingsScreen() {
  const online = useOnlineStatus()
  return (
    <Screen title="Impostazioni">
      <Card>
        <h2 className="mb-4 text-lg font-bold">Voce</h2>
        <VoiceSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Obiettivi e promemoria</h2>
        <GoalSettings />
      </Card>
      <Link
        to="/prova"
        className="flex min-h-12 items-center justify-between rounded-2xl bg-white px-5 font-semibold shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        Prova voce e microfono <span aria-hidden="true">›</span>
      </Link>
      <Card>
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600 dark:text-slate-300">Versione</dt>
            <dd className="font-medium">{__APP_VERSION__}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600 dark:text-slate-300">Connessione</dt>
            <dd className="font-medium">{online ? 'Online' : 'Offline'}</dd>
          </div>
        </dl>
      </Card>
    </Screen>
  )
}
