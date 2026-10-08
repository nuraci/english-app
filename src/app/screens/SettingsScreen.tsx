import { Card, Screen } from '../../ui/Screen'
import { useOnlineStatus } from '../../ui/useOnlineStatus'

export function SettingsScreen() {
  const online = useOnlineStatus()
  return (
    <Screen title="Impostazioni">
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
