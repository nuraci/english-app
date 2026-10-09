import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useT } from '../i18n'
import { Button } from './Button'

export function UpdatePrompt() {
  const t = useT()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // L'avviso "pronta offline" è solo informativo: sparisce da solo per non coprire gli esercizi.
  useEffect(() => {
    if (!offlineReady || needRefresh) return
    const timer = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(timer)
  }, [offlineReady, needRefresh, setOfflineReady])

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
    >
      <p className="mb-3">{needRefresh ? t('update.available') : t('update.offlineReady')}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          {needRefresh ? t('update.later') : t('update.ok')}
        </Button>
        {needRefresh && (
          <Button onClick={() => void updateServiceWorker()}>{t('update.reload')}</Button>
        )}
      </div>
    </div>
  )
}
