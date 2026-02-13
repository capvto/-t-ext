# Backend Markdown Publish API

Backend Fastify + Prisma + PostgreSQL per sostituire Netlify Functions + Netlify Blobs mantenendo compatibilità con il frontend attuale.

## Endpoint compatibili

- `POST /publish` body `{ title?: string, content: string, slug?: string }`
- `GET /paste?id=<id>`
- `POST /update` body `{ id: string, editCode: string, content: string }`
- `POST /delete` body `{ id: string, editCode: string }`

Tutte le risposte sono JSON e includono `cache-control: no-store`.

## Requisiti

- Node.js 22 LTS
- PostgreSQL 15+

## Setup locale

1. Copia env:

```bash
cp .env.example .env
```

2. Installa dipendenze:

```bash
npm install
```

3. Esegui migrazioni:

```bash
npm run prisma:migrate:dev
```

4. Avvia in sviluppo:

```bash
cp .env.example .env
```

API disponibile su `http://localhost:3001`.

## Variabili d'ambiente

- `NODE_ENV`: `development | test | production`
- `PORT`: porta API (default `3001`)
- `DATABASE_URL`: connessione PostgreSQL
- `PUBLIC_BASE_URL`: base URL pubblica (es. `https://web.textmarkdown.app`)
- `TRUST_PROXY`: `true/false` per usare `X-Forwarded-*`
- `FORWARDED_HOST_ALLOWLIST`: host consentiti (CSV) quando `TRUST_PROXY=true`
- `CORS_ORIGINS`: origini CORS consentite (CSV)
- `RATE_LIMIT_PUBLISH_MAX`: max req per finestra su `/publish` (default `20`)
- `RATE_LIMIT_MUTATION_MAX`: max req per finestra su `/update` e `/delete` (default `60`)
- `RATE_LIMIT_WINDOW`: finestra rate-limit (default `1 minute`)
- `LOG_LEVEL`: livello log pino
- `NETLIFY_BLOBS_SITE_ID`: per script migrazione
- `NETLIFY_BLOBS_TOKEN`: per script migrazione
- `NETLIFY_BLOBS_STORE`: nome store Netlify Blobs (default `t-ext-rentry`)

## Sicurezza implementata

- `helmet` per security headers
- CORS configurabile
- Rate limit per IP (`/publish`, `/update`, `/delete`)
- Body limit 220 KB
- Hashing edit code con SHA-256 (`editHash`), mai persistito in chiaro
- Verifica edit code con confronto timing-safe
- Error handler centralizzato senza leak stack in produzione

## OpenAPI / Swagger

- JSON spec: `GET /docs/json`
- UI docs: `GET /docs`

## Test, lint, build

```bash
npm run lint
npm run format:check
npm run test
npm run build
```

## Docker

Avvio completo API + Postgres:

```bash
docker compose up --build
```

L'API ascolta su `http://localhost:3001`.

## Deploy

### VPS (Nginx/Caddy)

Configura reverse proxy path-based:

- `/publish`, `/paste`, `/update`, `/delete`, `/healthz`, `/docs` -> backend
- tutto il resto -> frontend SPA

Passa headers proxy corretti:

- `X-Forwarded-Proto`
- `X-Forwarded-Host`
- opzionale `X-Request-Id`

In produzione è raccomandato impostare `PUBLIC_BASE_URL` per evitare dipendenza da header dinamici.

### Fly / Render / Railway

- Deploy del container `backend/Dockerfile`
- PostgreSQL managed
- set env `DATABASE_URL`, `PUBLIC_BASE_URL`, `CORS_ORIGINS`
- usa `npm run prisma:migrate:deploy` come release/startup step

## Migrazione one-shot da Netlify Blobs

Prerequisiti:

- `DATABASE_URL`
- `NETLIFY_BLOBS_SITE_ID`
- `NETLIFY_BLOBS_TOKEN`
- opzionale `NETLIFY_BLOBS_STORE`

Dry-run:

```bash
npm run import:netlify:dry
```

Apply:

```bash
npm run import:netlify
```

Lo script importa/upserta `pastes/*` preservando `editHash`, `createdAt`, `updatedAt`.

## Compatibilità frontend

Il frontend può continuare a usare `VITE_PUBLISH_API_BASE` puntando al nuovo backend, ad esempio:

```env
VITE_PUBLISH_API_BASE=https://web.textmarkdown.app/api
```

## Decisioni architetturali

- Fastify è stato scelto per performance, plugin maturi e logging strutturato nativo.
- Prisma fornisce migrazioni affidabili e typing end-to-end del modello dati.
- Sicurezza applicata in profondità: validazione Zod, rate limit per endpoint sensibili, hashing/edit verification timing-safe, no-store globale.
- Deploy stateless con Docker + PostgreSQL esterno: semplice da scalare orizzontalmente dietro reverse proxy o PaaS.
