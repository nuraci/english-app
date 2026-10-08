import { Card, Screen } from '../../ui/Screen'

export function ProgressScreen() {
  return (
    <Screen title="Progressi">
      <Card>
        <p className="text-slate-600 dark:text-slate-300">
          Qui vedrai i tuoi progressi giorno dopo giorno.
        </p>
      </Card>
    </Screen>
  )
}
