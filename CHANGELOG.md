## [0.1.1-beta] - 2026-01-30

### Added
- **Modalità Blocchi opzionale**: attivabile da *Personalizza* (disattivata di default).
- Sidebar **Documenti** con apertura **hover** dal bordo sinistro.

### Changed
- Versioning aggiornato a **major.minor.patch** (SemVer) mantenendo il suffisso **`-beta`** finché la release non è stabile.
- **Personalizza**: selezione **tema/font** applicata e salvata **automaticamente** (rimossi i pulsanti *Applica* e *Salva & Chiudi*).
- Editor: placeholder **"Scrivi…"** visibile anche quando il contenuto è vuoto (non solo quando selezionato).
- **Electron**: opzione **Pubblica/Online** nascosta (disponibile solo nella versione web).

### Fixed
- Sidebar Documenti: **click su tutta la card** del documento per aprire (azioni hover escluse).
- Rimossa la tip "abilita i Blocchi" dalla sezione Documenti.
- Modalità Blocchi: il tasto **Elimina blocco** non compare più mentre scrivi (visibile solo in preview dopo <kbd>Esc</kbd>).
- Editor (classico e a blocchi): entrando in modifica con un click, l’area di scrittura viene **messa subito a fuoco** (niente doppio click).
- Modalità Blocchi: risolto un bug per cui, con testo su più righe, rientrando in edit dopo <kbd>Esc</kbd> l’area di scrittura poteva rimanere “schiacciata” finché non si digitava/cancellava qualcosa.

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

