import { useEffect, useState } from 'react'
import { updateSettings, useSettings, type Accent, type SttFallback } from '../core/db/settings'
import {
  englishVoices,
  isTtsSupported,
  loadVoices,
  MAX_RATE,
  MIN_RATE,
  pickVoice,
  useSpeaker,
} from '../core/speech'
import { Button } from './Button'

const ACCENTS: { value: Accent; label: string }[] = [
  { value: 'en-GB', label: '🇬🇧 Britannico' },
  { value: 'en-US', label: '🇺🇸 Americano' },
]

const FALLBACKS: { value: SttFallback; label: string }[] = [
  { value: 'type', label: 'Scrivo la risposta' },
  { value: 'selfgrade', label: 'Mi valuto da solo' },
]

const SAMPLE = 'Hello! I am a validation engineer. The supply voltage is three point three volts.'

const selectClass =
  'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950'

/** Scelta di accento, voce e velocità; si salva subito. */
export function VoiceSettings() {
  const settings = useSettings()
  const { speak } = useSpeaker()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    let alive = true
    void loadVoices().then((v) => alive && setVoices(englishVoices(v)))
    return () => {
      alive = false
    }
  }, [])

  if (!isTtsSupported()) {
    return <p>Questo browser non può leggere ad alta voce. Prova con Chrome.</p>
  }

  const accentVoices = voices.filter((v) => v.lang.replace('_', '-') === settings.accent)
  const current = pickVoice(voices, settings.accent, settings.voiceURI)

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 font-semibold">Accento</legend>
        <div className="grid grid-cols-2 gap-2">
          {ACCENTS.map((a) => (
            <Button
              key={a.value}
              variant={settings.accent === a.value ? 'primary' : 'secondary'}
              aria-pressed={settings.accent === a.value}
              onClick={() => void updateSettings({ accent: a.value, voiceURI: null })}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </fieldset>

      {accentVoices.length > 1 && (
        <label className="block">
          <span className="mb-2 block font-semibold">Voce</span>
          <select
            className={selectClass}
            value={current?.voiceURI ?? ''}
            onChange={(e) => void updateSettings({ voiceURI: e.target.value })}
          >
            {accentVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
                {v.localService ? '' : ' (online)'}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-2 flex justify-between font-semibold">
          Velocità <span className="font-normal">{settings.rate.toFixed(1)}×</span>
        </span>
        <input
          type="range"
          min={MIN_RATE}
          max={MAX_RATE}
          step={0.1}
          value={settings.rate}
          onChange={(e) => void updateSettings({ rate: Number(e.target.value) })}
          className="h-11 w-full accent-teal-700"
        />
        <span className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Lenta</span>
          <span>Veloce</span>
        </span>
      </label>

      <Button variant="secondary" className="w-full" onClick={() => void speak(SAMPLE)}>
        Prova la voce
      </Button>

      <VoiceHelp />

      <label className="block">
        <span className="mb-2 block font-semibold">Se il microfono non funziona</span>
        <select
          className={selectClass}
          value={settings.sttFallback}
          onChange={(e) => void updateSettings({ sttFallback: e.target.value as SttFallback })}
        >
          {FALLBACKS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/** Come scaricare voci migliori sul telefono: l'app usa quelle installate nel sistema. */
function VoiceHelp() {
  return (
    <details
      className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800"
      data-testid="voice-help"
    >
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
        💡 Come avere voci migliori
      </summary>
      <p className="mt-1">
        L’app usa le voci installate sul telefono. Su Android le migliori si scaricano a parte:
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          Apri le <strong>Impostazioni di Android</strong> → <em>Sistema</em> → <em>Lingue</em> →{' '}
          <strong>Output sintesi vocale</strong> (oppure cerca «sintesi vocale» nelle impostazioni).
        </li>
        <li>
          Accanto a <strong>Google</strong> tocca l’ingranaggio →{' '}
          <strong>Installa dati vocali</strong> → <strong>English (United Kingdom)</strong> (o
          United States).
        </li>
        <li>
          Ascolta le voci disponibili, maschili e femminili, e scarica quelle che ti piacciono.
        </li>
        <li>
          Torna qui: se ci sono più voci compare il menu <strong>Voce</strong> per sceglierla, e
          «Prova la voce» te la fa sentire.
        </li>
      </ol>
      <p className="mt-2">
        Le voci con «(online)» spesso suonano più naturali, ma funzionano solo con la rete. Le altre
        funzionano anche offline.
      </p>
    </details>
  )
}
