## [1.0.0] - 2026-02-13

### Added
- (t)ext è ora **self-hostabile**: puoi eseguire la piattaforma sul tuo server con backend dedicato (Fastify + Prisma + PostgreSQL) e frontend web.
- Workflow di deploy per VPS con Docker Compose e configurazione dominio/proxy per pubblicazione autonoma.

### Changed
- Release stabile: versione aggiornata a **1.0.0** (uscita dalla fase beta).

## [0.1.2-beta] - 2026-01-31

### Added
- Nuova route di modifica per le pagine pubblicate: `/edit/<id>`.
- L’editor delle pagine pubbliche usa ora l’editor classico di (t)ext (stessa UI/UX del documento normale), con controlli essenziali dedicati: **Copia link**, **Esci**, **Salva**, **Elimina**.
- Supporto “handoff” pulito: la chiave di modifica viene gestita via **sessionStorage** (non rimane nell’URL).

### Changed
- La pagina pubblicata è ora solo viewer: il pulsante **“Modifica”** porta sempre alla pagina `/edit/<id>` (flusso unico, niente più doppia interfaccia).
- In modalità modifica pubblica sono stati rimossi i controlli non necessari per evitare confusione: **Apri documenti / Nuovo documento / Pubblica** e tutte le affordance legate alla gestione documenti.

### Fixed
- Fix per i deep-link su route `/edit/*` (caricamento asset affidabile anche su route annidate).
- Correzioni a crash runtime che potevano causare pagina vuota/nera in alcune navigazioni (routing/variabili non definite).

## [0.1.1-beta] - 2026-01-30

### Added
- **Modalità Blocchi opzionale**: attivabile da *Personalizza* (disattivata di default).
- Sidebar **Documenti** con apertura **hover** dal bordo sinistro.

### Changed
- Versioning aggiornato a **major.minor.patch** (SemVer) mantenendo il suffisso **`-beta`** finché la release non è stabile.
- **Personalizza**: selezione **tema/font** applicata e salvata **automaticamente** (rimossi i pulsanti *Applica* e *Salva & Chiudi*).
- Editor: placeholder **"Scrivi…"** visibile anche quando il contenuto è vuoto (non solo quando selezionato).
- **Electron**: opzione **Pubblica/Online** nascosta (disponibile solo nella versione web).
- Pubblica: la **pagina pubblicata** espone **Modifica** come link a una pagina dedicata (**/edit/<id>**) che usa l’**editor classico (t)ext** con azioni dedicate (**Copia link**, **Esci**, **Salva**, **Elimina**). Il **codice segreto** viene richiesto in un modal e resta session‑only (`sessionStorage`) (non viene lasciato nell’URL).

### Fixed
- Sidebar Documenti: **click su tutta la card** del documento per aprire (azioni hover escluse).
- Rimossa la tip "abilita i Blocchi" dalla sezione Documenti.
- Modalità Blocchi: il tasto **Elimina blocco** non compare più mentre scrivi (visibile solo in preview dopo <kbd>Esc</kbd>).
- Editor (classico e a blocchi): entrando in modifica con un click, l’area di scrittura viene **messa subito a fuoco** (niente doppio click).
- Modalità Blocchi: risolto un bug per cui, con testo su più righe, rientrando in edit dopo <kbd>Esc</kbd> l’area di scrittura poteva rimanere “schiacciata” finché non si digitava/cancellava qualcosa.
- Pagina pubblicata: **Modifica** apre sempre la pagina dedicata (**/edit/<id>**) (niente più editor inline nella view), rendendo l’editing affidabile e consistente su Safari/WebView.
- Pagina **/edit/<id>**: ora usa l’**editor classico (t)ext** (stessa UI dell’app) per modificare le pagine pubbliche. La sidebar Documenti è disabilitata in queste route, e **Esci** funziona come “lock” (rimuove il codice dalla sessione e torna alla view).
- Editor: quando la nota di avvio (vuota) viene materializzata al primo input, la modifica non viene più interrotta (non esce più dalla edit mode al primo carattere).
- Deploy web (non-Netlify): risolto un problema per cui le route profonde (es. **/edit/<id>**) potevano mostrare una **pagina nera** perché gli asset venivano generati con base relativa. Ora le build web usano base assoluta (**/**).
- Packaging Electron: introdotto **`npm run build:electron`** che genera asset relativi (base **./**) per compatibilità `file://`, e aggiornata la pipeline di packaging per usare questa build.
- Pagina pubblicata / editor dedicato: risolto un crash che poteva lasciare una **pagina nera** in dev/prod a causa di un riferimento a variabile non definita (`publicId`) nel layout principale.

## [0.1.0-beta] - 2026-01-25

### Added
- **Rentry-like publish**: pubblica una nota come pagina pubblica con **link pubblico** + **link/codice segreto di modifica**.
- Pagina pubblica **/p/<id>** con rendering Markdown.
- **Salva in (t)ext** dalla pagina pubblica: importa la pagina nei documenti locali dell’app.

### Changed
- Versione aggiornata a **0.1.0-beta** (nuovo schema SemVer).

### Fixed
- Compatibilità Netlify: inizializzazione Blobs in Functions e fix routing/asset per link profondi (**/p/**).
- Stabilità pubblicazione su Netlify: rimosso uso di **strong consistency** (fallback a eventual consistency).

## [0.0.4-beta] - 2026-01-25

### Added
- **Personalizza (globale)**: CSS globale applicato a tutta l’app (salvato in locale).
- **10 temi globali predefiniti** (applicabili con un click).
- **Selettore font globale**:
  - Font UI/preview
  - Font monospace (codice)
- Menu **Impostazioni** (icona) con voci: **Personalizza**, **Avanzate**, **Lingua**.
- **Changelog** apribile cliccando la **versione** nel footer.

### Changed
- La sezione per-nota è ora in **Avanzate** (CSS + plugin Markdown della singola nota).

### Fixed
- Menu impostazioni sempre cliccabile (render in **portal** sopra ai layer “glass”).
- Blocco vuoto: altezza minima per evitare elementi tagliati.

## [0.0.3-beta] - 2026-01-25

> Nota: durante lo sviluppo questa release era stata inizialmente indicata come **0.0.2-beta**.
> Le voci di 0.0.2 sono state consolidate qui.

### Added
- Syntax highlighting dei **codeblock** in preview (highlight.js).
- Pulsante **Copia** sui codeblock con feedback “Copiato”.
- Syntax highlighting “leggero” anche nell’editor (inline Markdown).
- Preview **on-demand**: la preview appare quando esci dalla modifica con <kbd>Esc</kbd>.
- Versione nel footer letta automaticamente da `package.json`.
- Supporto **CSS/tema per singola nota** (CSS scoperato alla nota).
- Supporto **estensioni Markdown per nota** (JavaScript):
  - `transform(markdown)` per sintassi custom veloci (es. `!ciao!`, `-> Ciao ->`).
  - `use(md)` per estensioni avanzate via markdown-it.

### Changed
- Scroll migliorato per documenti lunghi (layout più “scroll-friendly”).
- Comportamento wheel/trackpad più naturale: trackpad = scroll nativo, inerzia solo dove serve.
- Quote `>` senza virgolette automatiche (se vuoi le virgolette, scrivi `> "testo"`).

### Fixed
- Inline code `` `ciao` ``: rimossi i backtick “decorativi” aggiunti dallo stile tipografico in preview.
- Bug di “bleed” dell’overlay highlight (editor) fuori dalla card in alcune condizioni di layout/resize.
