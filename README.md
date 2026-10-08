# TechTalk Coach

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
