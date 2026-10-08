import { Card, Screen } from '../../ui/Screen'

export function TodayScreen() {
  return (
    <Screen title="Oggi">
      <Card>
        <p className="text-lg font-semibold">Ciao! 👋</p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Qui troverai la tua sessione di 30 minuti. Pochi minuti al giorno fanno la differenza.
        </p>
      </Card>
    </Screen>
  )
}
