# (t)ext

<p align="center">
  <b>(t)ext</b> è un editor Markdown minimalista con UI glassmorphism, disponibile come app <b>Electron</b> e come <b>web app</b>.
  <br/>
  Sviluppato da <a href="https://www.matteocaputo.dev">Matteo Caputo</a>, <a href="https://davialessio.dev/">Alessio Daví</a> e <a href="https://manuelzambelli.it/">Manuel Zambelli</a>
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-2B2E3A?logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-0F172A?logo=tailwindcss&logoColor=38BDF8" />
</p>

> Versione: **1.0.1**

---

## Cosa fa (in breve)

- **Editor continuo**: un’unica textarea Markdown, sempre pronta a ricevere testo — nessun meccanismo di blocchi o click per attivare.
- **Syntax highlighting nell’editor** (inline): `**bold**`, `*italic*`, `` `code` ``, link, heading, quote… senza perdere la semplicità della textarea.
- **Markdown moderno e sicuro**: rendering con **markdown-it** + sanitizzazione con **DOMPurify**.
- **Codice con syntax highlighting**: evidenziazione con **highlight.js** e pulsante **Copia** sui codeblock.
- **Import / Export**: importa un `.md` in un documento o esporta il contenuto in un file.
- **Documenti**: sidebar con ricerca, rinomina inline, crea/elimina e apertura hover dal bordo sinistro.
- **Personalizza (globale)**: 10 temi, selezione font (UI/preview) + monospace, CSS globale.
- **Avanzate (per nota)**: CSS per singola nota (scopato automaticamente) + estensioni Markdown (plugin JS).
- **Pubblica / Online (solo web)**: pubblica una nota come pagina condivisibile con link pubblico + **codice segreto** per modificare o eliminare.
  - **Modifica** apre una pagina dedicata `/edit/<id>` con l’editor (t)ext e azioni dedicate (**Copia link**, **Esci**, **Salva**, **Elimina**). Il codice segreto resta in `sessionStorage` (non nell’URL); **Esci** lo rimuove.
  - Supporta slug personalizzato, copy‑link, salvataggio, delete e “Salva in (t)ext”.
- **Mobile-friendly**: altezza viewport dinamica, gestione notch/home bar, touch target 44 px, topbar adattiva.
- **Changelog in‑app**: clic sulla versione nel footer per aprire il changelog.
- **Multi‑lingua**: IT / EN.
- **Salvataggio locale**: autosave in `localStorage` (nessun backend necessario).
- **Nota di avvio**: all’apertura parti da una nota vuota; al primo input diventa un documento reale senza interrompere la scrittura.

---

## Scorciatoie (keyboard)

Nell’editor:

- <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>B</kbd> → **bold** (wrappa in `**…**`)
- <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>I</kbd> → *italic* (wrappa in `*…*`)
- <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>U</kbd> → <u>underline</u> (wrappa in `<u>…</u>`)

---

## Personalizzazione per nota (CSS + Estensioni)

In alto a destra trovi il pulsante **Customize / Personalizza**.

### CSS (tema)

Puoi scegliere un **tema predefinito** oppure incollare CSS libero: l’app lo **scopa automaticamente** alla nota, quindi non “sporca” il resto dell’interfaccia.

### Estensioni Markdown (JavaScript)

Ogni estensione è uno script che deve terminare con `return { ... }`.

- `transform(markdown, api)` → trasforma il testo prima del rendering (perfetto per sintassi tipo `!ciao!`).
- `use(md, api)` → per regole avanzate via markdown-it.

L’oggetto `api` offre helper utili:

- `api.inline(text, className)` → genera HTML inline sicuro (testo escapato)
- `api.block(text, className)` → genera un blocco HTML (con newline)

> Nota: i plugin sono **codice fidato**. Usali solo con script che conosci.

---

## Requisiti

- Node.js (LTS consigliato)
- npm

---

## Setup

```bash
npm install
```

### Sviluppo (Electron + Vite)

```bash
npm run dev
```

### Sviluppo (solo web)

```bash
npm run dev:web
```

### Build / Preview

```bash
npm run build
npm run preview
```

> Nota: `npm run build` è pensato per **deploy web** e genera asset con base assoluta (**/**),
> così i deep-link (es. `/edit/<id>`, `/<id>`, `/p/<id>`) funzionano anche fuori da Netlify.

### Packaging (Electron Builder)

Il packaging Electron usa automaticamente una build dedicata (`npm run build:electron`) che genera
asset relativi (base **./**) per compatibilità con `file://`.

```bash
# build cartella (senza installer)
npm run pack

# build + installer (mac/win/linux)
npm run dist
```

Per forzare manualmente una build compatibile `file://` (asset relativi), usa:

```bash
npm run build:electron
```

---

## Struttura del progetto

- `electron/` → main process + preload (IPC per import/export e integrazioni native)
- `netlify/` → Functions per la modalità **Pubblica/Online** (solo web) + storage via Netlify Blobs
- `src/` → app React
  - `components/MarkdownBlock.tsx` → editor con textarea + syntax highlighting overlay
  - `lib/markdown.ts` → renderer Markdown + highlighting codeblock
  - `lib/mdHighlight.ts` → highlighting “leggero” nell’editor

---

## Privacy

(t)ext usa **storage tecnico locale** (`localStorage`) per salvare i documenti sul dispositivo.  
Nella versione **web**, se usi **Pubblica/Online**, il contenuto della pagina pubblica viene salvato su infrastruttura Netlify (Blobs/Functions) per poterlo condividere.  
Non include tracking/analytics di terze parti.
