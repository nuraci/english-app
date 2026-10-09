# TechTalk Coach

**L’inglese per i colloqui tecnici degli ingegneri.** Non un altro corso generico: verbi, numeri, spelling,
vocabolario tecnico e simulazioni di colloquio, con il lessico di laboratorio, firmware e debug.

PWA mobile-first per allenare l'inglese parlato e l'ascolto in vista di colloqui tecnici.
Contesto e regole in `CLAUDE.md`, roadmap in `PLAN.md`.

## Comandi

- `npm run dev` — sviluppo (in ascolto su tutta la LAN: apri `http://<ip-pc>:5173` dal telefono)
- `npm run build` / `npm run preview` — build di produzione e anteprima (il service worker funziona solo qui)
- `npm test` — unit test (Vitest)
- `npm run e2e` — test Playwright su viewport Pixel 7
- `npm run lint` / `npm run format`
- `npm run icons` — rigenera le icone PWA da `public/logo.svg`

## Deploy su GitHub Pages

1. Crea un repository su GitHub e fai push del branch `main`.
2. In _Settings → Pages_ scegli **Source: GitHub Actions**.
3. Ogni push su `main` esegue lint, test ed e2e e pubblica su `https://<utente>.github.io/<repo>/`.

Sul telefono (Chrome Android) apri l'indirizzo, poi menu ⋮ → **Installa app**.
Nota: microfono e installazione richiedono HTTPS, quindi il dev server in LAN (HTTP) non basta per provarli.

## Autori
Ideata e sviluppata da **Nunzio Raciti** insieme a **Claude** (Anthropic), con Claude Code.

## Sincronizzazione con Google Drive (facoltativa)
Per usare l'app su telefono e PC con gli stessi progressi. I dati finiscono in una cartella nascosta
del tuo Drive che solo l'app vede (permesso `drive.appdata`); le registrazioni audio restano sui dispositivi.

Una volta sola, su <https://console.cloud.google.com>:
1. Crea un progetto (es. «TechTalk Coach»).
2. *API e servizi → Libreria* → abilita **Google Drive API**.
3. *Google Auth Platform* (schermata di consenso OAuth) → tipo **Esterno**, nome app, la tua email;
   in *Accesso ai dati* aggiungi l'ambito `https://www.googleapis.com/auth/drive.appdata`;
   in *Pubblico / Utenti di test* aggiungi il tuo account Google.
4. *Client* → **Crea client** → tipo **Applicazione web** → *Origini JavaScript autorizzate*:
   `https://nuraci.github.io` → crea e copia l'**ID client** (finisce con `.apps.googleusercontent.com`).
5. Salvalo come variabile del repository (non è un segreto):
   `gh variable set GOOGLE_CLIENT_ID --body "<ID client>"` e rifai il deploy.

Poi nell'app: *Impostazioni → Sincronizzazione (Google Drive) → Collega Google Drive*, su ogni dispositivo.
