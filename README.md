# (t)ext

<p align="center">
  <b>(t)ext</b> è un editor di Markdown in Electron con due modalità: <i>classica</i> (un unico documento) e <i>block‑based</i> opzionale.
  <br/>
  La modalità a blocchi è disattivata di default e si può attivare da <b>Personalizza</b>.
  <br/>
  Sviluppato da <a href="https://www.matteocaputo.dev">Matteo Caputo</a>, <a href="https://davialessio.dev/">Alessio Daví</a> e <a href="https://manuelzambelli.dev/">Manuel Zambelli</a>
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-2B2E3A?logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-0F172A?logo=tailwindcss&logoColor=38BDF8" />
</p>

> Versione: **1.0.0**  

> Novità 1.0.0: **(t)ext è ora self-hostabile**.  
> Puoi installare e gestire frontend + backend sulla tua infrastruttura, con pieno controllo del deploy.

Per i dettagli operativi del backend (Docker, env, deploy VPS), vedi `backend/README.md`.

---

## Cosa fa (in breve)

- **Modalità classica (default)**: un unico editor Markdown continuo.
- **Self-host completo (novità 1.0.0)**: puoi eseguire (t)ext sul tuo server con backend dedicato e dominio personalizzato.
- **Modalità a blocchi (opzionale)**: ogni “paragrafo” diventa un blocco indipendente (attivabile da *Personalizza*).
- **Editing one‑click**: in classico e a blocchi, un click entra in modifica e puoi scrivere subito (niente doppio click).
- **Preview on‑demand**: mentre modifichi vedi solo l’editor; la preview compare quando esci con <kbd>Esc</kbd>.
- **Markdown moderno e sicuro**: rendering con **markdown-it** + sanitizzazione con **DOMPurify**.
- **Codice con syntax highlighting**: evidenziazione con **highlight.js** e pulsante **Copia** sui codeblock.
- **Syntax highlighting leggero anche nell’editor** (inline): `**bold**`, `*italic*`, `` `code` ``, link, heading, quote… (senza perdere la semplicità della textarea).
- **Import / Export**: importa un `.md` in un documento o esporta il contenuto in un file.
- **Documenti**: sidebar con ricerca, rinomina inline, crea/elimina e apertura hover dal bordo.
- **Personalizza (globale)**: 10 temi, selezione font (UI/preview) + monospace, CSS globale e toggle modalità a blocchi.
- **Avanzate (per nota)**: CSS per singola nota (scopato automaticamente) + estensioni Markdown (plugin JS).
- **Pubblica / Online (solo web)**: pubblica una nota come pagina condivisibile con link pubblico + **codice segreto** per modificare o eliminare.
  - Nella pagina pubblica **Modifica** apre sempre una pagina dedicata **/edit/<id>** che usa l’**editor classico (t)ext** (stessa UI dell’app) con azioni dedicate (**Copia link**, **Esci**, **Salva**, **Elimina**). Il **codice segreto** viene richiesto in un modal, resta solo in `sessionStorage` (non viene lasciato nell’URL) e **Esci** rimuove il codice dalla sessione (lock). In queste route la sidebar Documenti è disabilitata per non avere due interfacce diverse.
  - Supporta link personalizzato (slug), copy‑link, salvataggio, delete e “Salva in (t)ext”.
- **Changelog in‑app**: clic sulla versione nel footer per aprire il changelog.
- **Multi‑lingua**: IT / EN.
- **Salvataggio locale**: autosave in `localStorage` (nessun backend).
- **Nota di avvio (vuota)**: all’apertura parti da una nota vuota; al primo input viene materializzata come documento reale **senza interrompere la scrittura**.

---

## Scorciatoie (keyboard)

Dentro un blocco in modifica:

- <kbd>Esc</kbd> → esci dalla modifica (torna la preview)
- <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> → **split** del blocco al cursore
- <kbd>Backspace</kbd> all’inizio del blocco → unisci al blocco precedente  
  Se il blocco è vuoto → **cancella** il blocco
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
  - `components/MarkdownBlock.tsx` → blocco (editor + preview)
  - `lib/markdown.ts` → renderer Markdown + highlighting codeblock
  - `lib/mdHighlight.ts` → highlighting “leggero” nell’editor

---

## Privacy

(t)ext usa **storage tecnico locale** (`localStorage`) per salvare i documenti sul dispositivo.  
Nella versione **web**, se usi **Pubblica/Online**, il contenuto della pagina pubblica viene salvato su infrastruttura Netlify (Blobs/Functions) per poterlo condividere.  
Non include tracking/analytics di terze parti.
