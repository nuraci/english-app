# TechTalk Tutor — backend (Cloudflare Worker)

Il Tutor AI dell'app parla con Claude passando da questo piccolo server, così la chiave dell'API
non finisce mai nel telefono (regola 7 di `CLAUDE.md`).

Cosa fa:

- `POST /api/tutor` — un turno di conversazione: risposta del tutor in inglese, 1–3 correzioni
  in italiano, errori per il ripasso SRS, riepilogo finale.
- `GET /api/usage` — consumo di oggi del dispositivo (richieste, token, costo stimato).
- Accesso solo con un **codice** scelto da te (`ACCESS_CODES`), CORS limitato al sito dell'app.
- **Limiti giornalieri** per dispositivo (`DAILY_REQUESTS`, `DAILY_TOKENS`) e un **tetto di spesa
  totale** al giorno (`DAILY_COST_CAP_USD`).
- Modello e parametri da variabili (`MODEL`, predefinito `claude-opus-5-5`; `EFFORT`, predefinito
  `low`): si cambiano senza toccare il codice. Risposte strutturate (JSON schema), cache del prompt,
  fallback automatico sui rifiuti dei filtri di sicurezza (`fallbacks: "default"`).

## Pubblicarlo (una volta sola)

Serve un account Cloudflare (il piano gratuito basta) e una chiave API di Anthropic
(<https://console.anthropic.com>).

```bash
cd worker
npm install
npx wrangler login                          # apre il browser
npx wrangler kv namespace create USAGE      # copia l'id in wrangler.toml (kv_namespaces → id)
npx wrangler secret put ANTHROPIC_API_KEY   # incolla la chiave
npx wrangler secret put ACCESS_CODES        # scegli un codice lungo, es. 4 parole a caso
npm run deploy                              # stampa l'indirizzo: https://techtalk-tutor.<account>.workers.dev
```

Poi nell'app: **Impostazioni → Tutor AI** → incolla l'indirizzo e il codice → *Verifica la connessione*.

Se l'app è pubblicata su un dominio diverso da `https://nuraci.github.io`, aggiungilo in
`ALLOWED_ORIGINS` dentro `wrangler.toml` e rifai il deploy.

## Sviluppo

```bash
npm test            # test (client Anthropic e KV finti: nessun costo)
npm run typecheck
npm run dev         # server locale; i segreti in .dev.vars (non va nel repository)
```

## Costi

Il costo mostrato nell'app è una **stima** calcolata con `PRICE_INPUT_PER_MTOK` e
`PRICE_OUTPUT_PER_MTOK` (predefiniti: 4 e 20 dollari per milione di token, i prezzi di Claude Opus 5.5).
Se cambi `MODEL`, aggiorna anche i prezzi. Il consumo reale è nella console di Anthropic.
