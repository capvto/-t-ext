# (t)ext

<p align="center">
  <b>(t)ext</b> è un editor di Markdown <i>block‑based</i> dal look moderno, con anteprima immediata.
  <br/>
  Sviluppato da <a href="https://www.matteocaputo.dev">Matteo Caputo</a>
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-2B2E3A?logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind%20CSS-0F172A?logo=tailwindcss&logoColor=38BDF8" />
</p>

<p align="center">
  <img alt="markdown-it" src="https://img.shields.io/badge/markdown--it-000000?logo=markdown&logoColor=white" />
  <img alt="DOMPurify" src="https://img.shields.io/badge/DOMPurify-1E293B?logo=dompurify&logoColor=white" />
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer%20Motion-111827?logo=framer&logoColor=white" />
  <img alt="Lucide" src="https://img.shields.io/badge/Lucide-0B1220?logo=lucide&logoColor=white" />
  <img alt="electron-builder" src="https://img.shields.io/badge/electron--builder-2B2E3A?logo=electron&logoColor=white" />
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white" />
  <img alt="npm" src="https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white" />
</p>

---

## Caratteristiche

- **Editor a blocchi (paragraph blocks)**: ogni paragrafo è un blocco indipendente, più pulito.
- **Anteprima “live”**: mentre scrivi sei in editing, quando smetti di digitare compare l’anteprima.
- **Shortcut inline per formattazione**
  - `Ctrl/Cmd + B` → **grassetto**
  - `Ctrl/Cmd + I` → *corsivo*
  - `Ctrl/Cmd + U` → <u>sottolineato</u>
- **Split / Merge dei blocchi**
  - `Ctrl/Cmd + Enter` → divide il blocco al cursore
  - `Backspace` all’inizio del blocco → unisce col precedente (o elimina se vuoto)
- **Gestione multi‑documento**
  - lista documenti con **ricerca** su titolo e contenuto
  - rinomina e cancellazione rapida
  - **nuovo documento ad ogni avvio** (senza accumulare “Untitled” vuoti)
- **Import / Export Markdown**
  - export in `.md` con **save dialog** nativo su Electron
  - fallback browser: download `.md`
  - import da file Markdown (dialog nativo / input file web)
- **Preview sicura**: rendering Markdown con `markdown-it` e sanitizzazione HTML con `DOMPurify`.
- **UI fluida**: micro‑animazioni con `framer-motion` e scroll inerziale.

---

## Scorciatoie da tastiera

| Azione | Shortcut |
|---|---|
| Grassetto | `Ctrl/Cmd + B` |
| Corsivo | `Ctrl/Cmd + I` |
| Sottolineato | `Ctrl/Cmd + U` |
| Dividi blocco al cursore | `Ctrl/Cmd + Enter` |
| Esci dall’editing del blocco | `Esc` |

---

## Avvio rapido

### Requisiti
- **Node.js** (consigliato: LTS)

### Installazione
```bash
npm install
```

### Sviluppo (Electron + Vite)
```bash
npm run dev
```

### Sviluppo solo Web (Vite)
```bash
npm run dev:web
```

### Build (renderer)
```bash
npm run build
```

### Preview build (web)
```bash
npm run preview
```

### Packaging desktop
```bash
# build + cartella unpacked
npm run pack

# build + installer (mac dmg / win nsis / linux AppImage)
npm run dist
```

---

## Struttura del progetto

- `src/` → UI React (editor, sidebar, rendering Markdown)
- `electron/`
  - `main.mjs` → processo principale Electron (menu + IPC)
  - `preload.mjs` → bridge sicuro (`contextBridge`) per open/save dialog e menu actions
- `tailwind.config.ts` / `postcss.config.cjs` → styling

---

## Autore

**Matteo Caputo**  
Portfolio: https://www.matteocaputo.dev

---

## Licenza

Nessuna licenza specificata per il momento.
