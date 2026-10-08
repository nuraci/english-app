# PLAN.md — Roadmap di TechTalk Coach

## Come usare questo piano con Claude Code

1. Crea una cartella vuota, mettici `CLAUDE.md` e `PLAN.md`, fai `git init`.
2. Avvia Claude Code e scrivi: **"Leggi CLAUDE.md e PLAN.md, poi implementa la Fase 0."**
3. A fine fase prova sul telefono, poi: **"Fase 0 ok, procedi con la Fase 1."**
4. Se qualcosa non ti piace, dillo prima di passare alla fase successiva.
5. Le fasi 0–8 bastano per un'app completa per uso personale. Le fasi 9–10 servono per il Tutor AI e per vendere.

Ogni fase ha: **Obiettivo**, **Task**, **Criteri di accettazione**.

---

## Fase 0 — Fondamenta e PWA

**Obiettivo:** app vuota ma installabile sul telefono, che funziona offline.

- [x] Progetto Vite + React + TS strict, Tailwind, ESLint, Prettier
- [x] vite-plugin-pwa: manifest, icone, service worker, schermata offline
- [x] Routing con bottom navigation: Oggi · Allenamenti · Progressi · Impostazioni
- [x] Tema chiaro/scuro automatico, font leggibile, dimensioni generose
- [x] Vitest e Playwright configurati (viewport Pixel 7)
- [x] Deploy automatico su Cloudflare Pages o GitHub Pages (HTTPS, necessario per microfono e PWA) — workflow GitHub Actions pronto, da attivare collegando il repo (vedi README)

**Accettazione:** su Android Chrome compare "Installa app", l'app si apre dall'icona, funziona in modalità aereo.

---

## Fase 1 — Motore comune

**Obiettivo:** i mattoni che tutti i moduli riusano.

- [x] `core/speech/tts`: wrapper di `speechSynthesis`; scelta voce (en-US / en-GB), velocità (0.6–1.2), coda di frasi, evento di fine
- [x] `core/speech/stt`: wrapper di `SpeechRecognition` con feature detection; se non disponibile, fallback a scrittura o autovalutazione
- [x] `core/srs`: ts-fsrs; ogni item ha stato di ripasso; funzione `getDueItems(module, n)`
- [x] `core/session`: esercizio generico
  ```ts
  type Exercise = {
    id: string
    module: string
    prompt: { text?: string; speak?: string; hint?: string }
    answer: {
      accepted: string[]
      mode: 'type' | 'choice' | 'speak' | 'selfgrade'
      choices?: string[]
    }
    explanation?: string // in italiano
  }
  ```
- [x] `core/normalize`: confronto tollerante (maiuscole, punteggiatura, spazi, "47" vs "forty-seven", "Ω" vs "ohm")
- [x] Schema Dexie: `items`, `reviews`, `sessions`, `settings`, `userTexts`
- [x] Componente feedback incoraggiante con spiegazione dell'errore

**Accettazione:** pagina di debug che legge una frase in TTS, ascolta l'utente in STT e valuta una risposta; unit test su normalize e srs.

---

## Fase 2 — Verbi irregolari

**Obiettivo:** chiudere la lacuna sui verbi, partendo dai più usati sul lavoro.

- [x] Dataset `verbs.json` (~150 verbi): `base, past, participle, it, group, frequencyRank, example`
  - Esempi dal mondo validation/firmware: "I **wrote** the test firmware", "We **found** a bug in the ADC", "The board **ran** for 48 hours"
- [x] Gruppi per somiglianza (sing/sang/sung, keep/kept/kept, cut/cut/cut, ecc.): si impara un gruppo alla volta
- [x] Modalità: flashcard · scrivi le forme · ascolta e riconosci · completa la frase ("Yesterday I ___ (run) the regression")
- [x] Prima i 50 più frequenti, poi sblocco progressivo
- [x] Pronuncia di ogni forma via TTS (attenzione a read/read, -ed vs irregolari)

**Accettazione:** sessione di 10 minuti che mescola ripasso SRS e verbi nuovi del gruppo corrente.

---

## Fase 3 — Numeri (con le misure)

**Obiettivo:** capire e dire i numeri al primo colpo, soprattutto in contesto tecnico.

- [ ] **Generatore** (non lista statica) con livelli:
  1. Cardinali 0–100, coppie trappola (thirteen/thirty, fifteen/fifty…)
  2. Grandi numeri (hundred, thousand, million), ordinali, anni, date (UK vs US), orari
  3. Decimali ("three point three"), negativi, percentuali, prezzi
  4. Telefoni e codici ("oh", "double five")
  5. **Misure elettriche** con prefissi SI: "forty-seven kilo-ohms", "two hundred millivolts peak-to-peak", "twelve nanoseconds rise time", "sixteen megahertz"
  6. Tolleranze e range: "plus or minus five percent", "from minus forty to one hundred twenty-five degrees Celsius"
  7. Esadecimale e registri: "zero x four zero zero zero", "bit seven", "address offset zero x one C"
- [ ] Modalità: ascolta e scrivi · leggi ad alta voce (STT) · velocità crescente
- [ ] Statistiche sugli errori ricorrenti (es. confonde sempre -teen/-ty) e riproposta mirata

**Accettazione:** almeno 7 livelli giocabili, il generatore produce varianti infinite, test unitari sulla conversione numero ↔ parole.

---

## Fase 4 — Spelling

**Obiettivo:** fare e capire lo spelling senza esitazioni.

- [ ] Alfabeto con focus sulle trappole per italiani: A/E/I, G/J, K/Q, R, W, Y, H ("aitch"), Z (zed/zee)
- [ ] Alfabeto NATO (Alpha, Bravo…) come aiuto opzionale
- [ ] Dettati: part number (STM32H743, LPC55S69, ESP32-S3), sigle (I2C, SPI, CAN FD, JTAG), nomi, email ("at", "dot", "underscore", "dash")
- [ ] Modalità inversa: l'app mostra una parola, l'utente fa lo spelling a voce (STT)
- [ ] Esercizio fisso: "Spell your name / surname / email" (dati inseriti dall'utente)

**Accettazione:** dettato di 10 codici con correzione lettera per lettera evidenziata.

---

## Fase 5 — Vocabolario tecnico

**Obiettivo:** dire bene le parole che l'utente già conosce per iscritto.

- [ ] Mazzi tematici in `vocab/*.json`: `en, it, definitionEasy, example, pronunciationNote`
  - **Strumenti:** oscilloscope, probe, logic analyzer, power supply, SMU, multimeter, signal generator, climatic chamber
  - **Misure:** rise time, jitter, ripple, leakage current, power consumption, eye diagram, noise floor
  - **Firmware e debug:** register, interrupt, DMA, peripheral, bootloader, breakpoint, JTAG/SWD, watchdog
  - **Processo di validazione:** test plan, test bench, coverage, corner cases, PVT, characterization, silicon bring-up, errata, root cause analysis, regression
  - **Soft skills:** teamwork, deadline, trade-off, ownership, troubleshooting
- [ ] Lista "trappole di pronuncia" per italiani: cache, data, silicon, oscilloscope, width, debug, via, voltage
- [ ] Modalità: ascolta e ripeti · traduci · definisci con parole tue (autovalutazione)

**Accettazione:** almeno 150 termini in 5 mazzi, ognuno ascoltabile.

---

## Fase 6 — Simulatore di colloquio (offline)

**Obiettivo:** arrivare al colloquio con risposte già provate ad alta voce.

- [ ] Banca domande: HR, tecniche (validation, misure, firmware, debug), comportamentali (metodo STAR)
  - "Tell me about yourself", "Describe a difficult bug you solved", "How do you validate a new peripheral?", "How do you measure power consumption in low-power modes?", "Why NXP?"
- [ ] **Costruttore di "Tell me about yourself"** guidato: chi sei · esperienza · punti di forza · perché questo ruolo
- [ ] Editor delle **proprie risposte**: l'utente le scrive, l'app le legge in TTS e le usa per lo shadowing
- [ ] Prova: domanda letta dalla voce → l'utente risponde → trascrizione STT → checklist di autovalutazione (chiarezza, durata, parole chiave)
- [ ] Frasi salvavita: "Could you repeat the question, please?", "Let me think about that for a second", "What I mean is…"
- [ ] Domande da fare al selezionatore

**Accettazione:** sessione completa da 10 domande con trascrizioni salvate e riascoltabili.

---

## Fase 7 — Shadowing e ascolto

**Obiettivo:** sbloccare la bocca imitando ritmo e intonazione.

- [ ] Player frase per frase: play · ripeti N volte · rallenta · registra la tua voce (MediaRecorder) · confronta
- [ ] Sorgenti: frasi dei moduli, risposte del colloquio scritte dall'utente
- [ ] **Import di sottotitoli `.srt`**: da un episodio di una serie (es. The IT Crowd) l'app crea una sessione di shadowing con le frasi
- [ ] **Modalità auto**: playlist solo audio, a mani libere, per il tragitto in macchina (frase in inglese → pausa per ripetere → traduzione)

**Accettazione:** un file `.srt` importato diventa una sessione di shadowing funzionante; modalità auto utilizzabile a schermo spento.

---

## Fase 8 — Piano giornaliero e motivazione

**Obiettivo:** rendere piacevole e costante l'abitudine.

- [ ] Schermata **Oggi**: sessione da 30 minuti composta in automatico (10 lacune · 10 ascolto/shadowing · 10 parlato), con i punti deboli in priorità
- [ ] Sessione lunga opzionale (film/serie + simulazione di colloquio)
- [ ] Serie di giorni consecutivi, XP, obiettivo settimanale, badge (es. "Numeri senza errori", "Primo colloquio completo")
- [ ] "Jolly" per saltare un giorno senza perdere la serie (niente sensi di colpa)
- [ ] Pagina Progressi: grafici per modulo, parole difficili, confronto "come parlavi un mese fa" (registrazioni datate)
- [ ] Promemoria giornaliero (notifica locale dove supportata)

**Accettazione:** usando l'app per 7 giorni simulati, statistiche e serie sono corrette (test e2e con data finta).

---

## Fase 9 — Tutor AI (Claude API)

**Obiettivo:** conversare davvero e ricevere correzioni, anche in voce.

- [ ] Backend minimo (es. Cloudflare Worker) che fa da proxy verso l'API di Anthropic: chiave solo lato server, limite di richieste e di token per utente
- [ ] Verifica sulla documentazione ufficiale (docs.claude.com) modello e parametri attuali, non hardcodare nomi a memoria
- [ ] Modalità:
  - **Colloquio realistico**: il tutor fa il selezionatore per un ruolo da Validation Engineer, una domanda alla volta, con follow-up tecnici
  - **Conversazione libera** su temi scelti (lavoro, hobby, progetti di elettronica)
  - **Correzione gentile**: a fine turno 1–3 correzioni spiegate in italiano, non di più
- [ ] Ciclo vocale: STT → tutor → TTS, con pulsante "parla" stile walkie-talkie
- [ ] Gli errori rilevati dal tutor diventano item SRS nei moduli corrispondenti
- [ ] Controllo costi: contatore di utilizzo visibile all'utente

**Accettazione:** colloquio simulato da 15 minuti interamente in voce, con riepilogo finale degli errori salvato.

---

## Fase 10 — Verso il prodotto (per venderla)

**Obiettivo:** trasformare lo strumento personale in un prodotto.

- [ ] **Posizionamento:** non "un altro Duolingo", ma _inglese per colloqui tecnici di ingegneri_. Il mercato generalista è affollato, la nicchia no.
- [ ] Pacchetti di contenuti per settore: semiconduttori (base), automotive, embedded/IoT, IT, dispositivi medicali
- [ ] UI tradotta per altri madrelingua (spagnolo, portoghese, francese): i contenuti in inglese restano gli stessi
- [ ] Onboarding con test di livello di 5 minuti
- [ ] Account e sincronizzazione (es. Supabase), esportazione dei dati
- [ ] Pagamenti: freemium (moduli base gratis, Tutor AI e pacchetti a pagamento). Se si pubblica sul Play Store (TWA o Capacitor) verificare gli obblighi di Google Play Billing per i beni digitali
- [ ] Privacy e GDPR: informativa, registrazioni locali per default, analytics rispettosi della privacy
- [ ] Landing page e lista d'attesa
- [ ] Beta con 10–20 colleghi ingegneri, raccolta feedback dentro l'app

**Accettazione:** 10 beta tester attivi per 2 settimane, almeno metà ancora attivi alla fine.

---

## Idee per dopo (backlog)

- Widget Android con "parola del giorno"
- Modalità "datasheet": incolli un paragrafo di un datasheet e l'app lo trasforma in esercizi di lettura ad alta voce
- Sfide tra colleghi (classifica settimanale)
- Esportazione di un "portfolio vocale" da riascoltare prima del colloquio
