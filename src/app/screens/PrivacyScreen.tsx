import { BackLink } from '../../ui/BackLink'
import { Card, Screen } from '../../ui/Screen'

/** Informativa sulla privacy, in parole semplici. */
export function PrivacyScreen() {
  return (
    <Screen title="Privacy">
      <BackLink to="/impostazioni" label="Impostazioni" />
      <Card>
        <h2 className="text-lg font-bold">In breve</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            I tuoi progressi, le tue risposte e le tue registrazioni restano sul tuo telefono.
          </li>
          <li>Non ci sono account, pubblicità, tracciamenti o statistiche di utilizzo.</li>
          <li>
            Puoi esportare o cancellare tutti i tuoi dati in qualsiasi momento, dalle Impostazioni.
          </li>
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Cosa resta sul telefono</h2>
        <p className="mt-1">
          Progressi e ripassi, impostazioni, risposte scritte, nome, cognome ed email per gli
          esercizi di spelling, sottotitoli importati e registrazioni audio. Sono salvati nella
          memoria del browser (IndexedDB) e non vengono inviati a nessuno.
        </p>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Riconoscimento vocale</h2>
        <p className="mt-1">
          Gli esercizi a voce usano il riconoscimento vocale del browser. Su Chrome per Android può
          avvenire sul telefono (se è installato il pacchetto offline) o sui server di Google,
          secondo le impostazioni del dispositivo. L’app non conserva l’audio usato per il
          riconoscimento.
        </p>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Tutor AI (facoltativo)</h2>
        <p className="mt-1">
          Solo se lo colleghi e lo usi: il testo della conversazione (la trascrizione di quello che
          dici, non l’audio) passa dal server del tutor ad Anthropic, che genera le risposte. Il
          server conta solo richieste e token per i limiti giornalieri, legati a un identificativo
          anonimo del dispositivo. Il riepilogo della sessione resta sul telefono.
        </p>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Suggerimenti</h2>
        <p className="mt-1">
          I suggerimenti che scrivi restano sul telefono e, se il tutor è collegato, arrivano al
          server con la versione dell’app. Non scrivere dati personali nei suggerimenti.
        </p>
      </Card>
    </Screen>
  )
}
