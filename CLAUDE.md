# CLAUDE.md — Contesto del progetto

## Cos'è

PWA mobile-first per allenare l'inglese **parlato e ascoltato** di ingegneri italiani,
con un focus iniziale su un caso concreto: un Validation Engineer di microcontrollori
che si prepara a un colloquio tecnico in inglese (es. NXP, sede di Catania).

Nome provvisorio: **TechTalk Coach** (da decidere).

## Utente target (versione 1)

- Madrelingua italiano, inglese parlato A2–B1, "arrugginito".
- Lacune principali: verbi irregolari, numeri (soprattutto in ascolto), spelling delle lettere.
- Esperto di elettronica, misure, firmware, debug: il vocabolario tecnico è il suo punto di forza.
- Usa l'app dal **telefono Android**, 30 minuti al giorno + 1–2 sessioni lunghe a settimana.
- Fa fatica e si scoraggia facilmente: l'app deve essere **leggera, incoraggiante, mai punitiva**.

## Stack

- Vite + React + TypeScript (strict)
- Tailwind CSS
- vite-plugin-pwa (installabile, offline-first)
- Dexie (IndexedDB) per dati utente e progressi
- ts-fsrs per la ripetizione distanziata
- Web Speech API: `speechSynthesis` (TTS) e `SpeechRecognition` (STT, con feature detection e fallback)
- Vitest (unit) + Playwright (e2e, viewport mobile)
- Deploy statico su HTTPS (Cloudflare Pages o GitHub Pages)

## Regole di lavoro

1. Lavora **una fase di PLAN.md alla volta**. Non anticipare fasi successive.
2. A fine fase: test verdi, build ok, spunta le checkbox in PLAN.md, incrementa la versione in `package.json` (`npm version <x.y.z> --no-git-tag-version`; Fase N → 0.(N+1).0, correzioni → patch), commit con messaggio chiaro.
3. Mobile first: progetta a 360px di larghezza, target touch ≥ 44px, una mano sola.
4. UI e spiegazioni in **italiano**; contenuti da imparare in **inglese**.
5. I contenuti didattici stanno in `/src/content/*.json` (o generatori in `/src/content/generators/`), mai hardcoded nei componenti.
6. Offline first: tutto tranne il Tutor AI deve funzionare senza rete.
7. Nessun segreto nel client. Le chiavi API vivono solo nel backend (Fase 9).
8. Le registrazioni vocali dell'utente restano sul dispositivo, salvo consenso esplicito.
9. Feedback sempre positivo e specifico: "Quasi! Hai scritto _thirty_, era _thirteen_", mai solo "Sbagliato".
10. Prima di usare una libreria o un'API esterna, verifica la documentazione attuale (nomi di modelli, versioni).

## Comandi

- `npm run dev` — sviluppo (usa `--host` per provare dal telefono in LAN)
- `npm run build` — build di produzione
- `npm test` — unit test
- `npm run e2e` — test Playwright
- `npm run lint`

## Struttura cartelle (obiettivo)

```
src/
  app/            routing, layout, bottom navigation
  core/
    speech/       wrapper TTS/STT
    srs/          motore ripetizione distanziata
    session/      motore esercizi generico
    db/           schema Dexie
    normalize/    normalizzazione risposte
  modules/
    verbs/  numbers/  spelling/  vocab/  interview/  shadowing/  tutor/
  content/        dati JSON e generatori
  ui/             componenti condivisi
```
