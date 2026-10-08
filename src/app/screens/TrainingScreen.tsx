import { Card, Screen } from '../../ui/Screen'

export function TrainingScreen() {
  return (
    <Screen title="Allenamenti">
      <Card>
        <p className="text-slate-600 dark:text-slate-300">
          Presto qui: verbi irregolari, numeri, spelling, vocabolario tecnico e simulazione di
          colloquio.
        </p>
      </Card>
    </Screen>
  )
}
