import { Link } from 'react-router-dom'
import { DataSettings } from '../../ui/DataSettings'
import { GoalSettings } from '../../ui/GoalSettings'
import { PackSettings } from '../../ui/PackSettings'
import { Card, Screen } from '../../ui/Screen'
import { SyncSettings } from '../../ui/SyncSettings'
import { TutorSettings } from '../../ui/TutorSettings'
import { useOnlineStatus } from '../../ui/useOnlineStatus'
import { VoiceSettings } from '../../ui/VoiceSettings'

const linkClass =
  'flex min-h-12 items-center justify-between rounded-2xl bg-white px-5 font-semibold shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800'

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
      <Card>
        <h2 className="mb-4 text-lg font-bold">Contenuti</h2>
        <PackSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Tutor AI (facoltativo)</h2>
        <TutorSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Sincronizzazione (Google Drive)</h2>
        <SyncSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">I tuoi dati</h2>
        <DataSettings />
      </Card>
      <Link to="/prova" className={linkClass}>
        Prova voce e microfono <span aria-hidden="true">›</span>
      </Link>
      <Link to="/benvenuto" className={linkClass}>
        Rifai il test di livello <span aria-hidden="true">›</span>
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
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600 dark:text-slate-300">Autori</dt>
            <dd className="text-right font-medium" data-testid="credits">
              Nunzio Raciti
              <br />
              <span className="font-normal text-slate-600 dark:text-slate-300">
                con Claude (Anthropic)
              </span>
            </dd>
          </div>
        </dl>
      </Card>
    </Screen>
  )
}
