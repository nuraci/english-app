import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../../core/db/db'
import { getSettings, updateSettings, useSettings, type Accent } from '../../core/db/settings'
import { createRng } from '../../core/random'
import type { Exercise, SessionState } from '../../core/session'
import { BarList } from '../../ui/charts/BarList'
import { Button } from '../../ui/Button'
import { PackSettings } from '../../ui/PackSettings'
import { Card, Screen } from '../../ui/Screen'
import { SessionRunner } from '../../ui/session/SessionRunner'
import { AREA_NAMES, AREAS, buildLevelTest, scoreLevelTest, type LevelResult } from './levelTest'

const LEVEL_KIND = 'level-test'

async function saveResult(result: LevelResult) {
  const now = Date.now()
  await db.userTexts.add({
    kind: LEVEL_KIND,
    title: result.overall,
    text: JSON.stringify(result),
    createdAt: now,
    updatedAt: now,
  })
  await updateSettings({ onboardingDone: true })
}

/** Benvenuto: cosa fa l'app, accento e pacchetti, test di livello da 5 minuti (facoltativo). */
export function WelcomeScreen() {
  const settings = useSettings()
  const navigate = useNavigate()
  const [step, setStep] = useState<'intro' | 'test' | 'result'>('intro')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [result, setResult] = useState<LevelResult | null>(null)

  const startTest = async () => {
    const s = await getSettings()
    setExercises(buildLevelTest(createRng(Date.now()), s.accent))
    setStep('test')
  }

  const finish = useCallback((results: SessionState['results']) => {
    const r = scoreLevelTest(results)
    void saveResult(r)
    setResult(r)
    setStep('result')
  }, [])

  const skip = async () => {
    await updateSettings({ onboardingDone: true })
    navigate('/')
  }

  if (step === 'test') {
    return (
      <Screen title="Test di livello">
        <p className="-mt-4 text-slate-600 dark:text-slate-300">
          16 domande veloci. Non è un esame: serve solo a capire da dove partire.
        </p>
        <SessionRunner
          module="onboarding"
          exercises={exercises}
          onDone={() => setStep('result')}
          onFinish={finish}
        />
      </Screen>
    )
  }

  if (step === 'result' && result) {
    return (
      <Screen title="Il tuo punto di partenza">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Livello indicativo</p>
          <p className="text-4xl font-bold" data-testid="level-overall">
            {result.overall}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Una stima per orientarti, non un certificato.
          </p>
        </Card>
        <Card>
          <BarList
            caption="Risultato per area"
            items={AREAS.map((a) => ({
              key: a,
              label: AREA_NAMES[a],
              value: result.areas[a].correct,
              detail: `${result.areas[a].correct}/${result.areas[a].total} · ${result.areas[a].label}`,
            }))}
          />
        </Card>
        <Card>
          <ul className="space-y-2">
            {result.recommendations.map((r) => (
              <li key={r}>👉 {r}</li>
            ))}
          </ul>
        </Card>
        <Link
          to="/"
          className="flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
        >
          Vai alla schermata Oggi
        </Link>
      </Screen>
    )
  }

  return (
    <Screen title="Benvenuto!">
      <Card>
        <p className="text-lg font-semibold">
          TechTalk Coach: l’inglese per i colloqui tecnici degli ingegneri.
        </p>
        <ul className="mt-3 space-y-1 text-slate-600 dark:text-slate-300">
          <li>🗣️ Parli e ascolti ogni giorno, 30 minuti alla volta</li>
          <li>🔁 Verbi, numeri e spelling: le lacune tipiche, una alla volta</li>
          <li>🎤 Simulazioni di colloquio con il tuo vocabolario tecnico</li>
          <li>🔒 I tuoi dati e la tua voce restano sul telefono</li>
        </ul>
      </Card>
      <Card>
        <p className="mb-2 font-semibold">Che inglese preferisci ascoltare?</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['en-GB', '🇬🇧 Britannico'],
              ['en-US', '🇺🇸 Americano'],
            ] as [Accent, string][]
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={settings.accent === value ? 'primary' : 'secondary'}
              aria-pressed={settings.accent === value}
              onClick={() => void updateSettings({ accent: value, voiceURI: null })}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <p className="mb-2 font-semibold">I tuoi contenuti</p>
        <PackSettings />
      </Card>
      <Button className="w-full" onClick={() => void startTest()}>
        Fai il test di livello (5 minuti)
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => void skip()}>
        Salta, lo farò più tardi
      </Button>
    </Screen>
  )
}
