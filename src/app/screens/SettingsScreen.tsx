import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import { DataSettings } from '../../ui/DataSettings'
import { FeedbackCard } from '../../ui/FeedbackCard'
import { GoalSettings } from '../../ui/GoalSettings'
import { PackSettings } from '../../ui/PackSettings'
import { Card, Screen } from '../../ui/Screen'
import { TutorSettings } from '../../ui/TutorSettings'
import { useOnlineStatus } from '../../ui/useOnlineStatus'
import { VoiceSettings } from '../../ui/VoiceSettings'

export function SettingsScreen() {
  const online = useOnlineStatus()
  const t = useT()
  return (
    <Screen title={t('nav.settings')}>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('settings.voice')}</h2>
        <VoiceSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('settings.goals')}</h2>
        <GoalSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('settings.plan')}</h2>
        <PackSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('settings.tutor')}</h2>
        <TutorSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('settings.data')}</h2>
        <DataSettings />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Suggerimenti</h2>
        <FeedbackCard />
      </Card>
      <Link
        to="/prova"
        className="flex min-h-12 items-center justify-between rounded-2xl bg-white px-5 font-semibold shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        {t('settings.test')} <span aria-hidden="true">›</span>
      </Link>
      <Link
        to="/benvenuto"
        className="flex min-h-12 items-center justify-between rounded-2xl bg-white px-5 font-semibold shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
      >
        Rifai il test di livello <span aria-hidden="true">›</span>
      </Link>
      <Card>
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600 dark:text-slate-300">{t('settings.version')}</dt>
            <dd className="font-medium">{__APP_VERSION__}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600 dark:text-slate-300">{t('settings.connection')}</dt>
            <dd className="font-medium">{online ? t('settings.online') : t('settings.offline')}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600 dark:text-slate-300">{t('settings.authors')}</dt>
            <dd className="text-right font-medium" data-testid="credits">
              Nunzio Raciti
              <br />
              <span className="font-normal text-slate-600 dark:text-slate-300">
                {t('settings.with', { name: 'Claude (Anthropic)' })}
              </span>
            </dd>
          </div>
        </dl>
      </Card>
    </Screen>
  )
}
