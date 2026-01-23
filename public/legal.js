// (t)ext — Legal helper
// This file is purposely framework-agnostic so it can run in both the web build and Electron.
// If the React UI already renders a policy link (data-legal="policy-link"), this script becomes a no-op.

const UPDATED_AT = "23/01/2026";

const POLICY_HTML = `
  <p>
    Questa informativa descrive come (t)ext tratta i dati personali e come utilizza cookie o strumenti equivalenti
    durante l'uso dell'app. (t)ext è un editor di Markdown che funziona in locale: i contenuti restano sul tuo dispositivo.
  </p>

  <h2>Titolare del trattamento</h2>
  <p>
    Il titolare del trattamento è <strong>Matteo Caputo</strong> ("Titolare"). Puoi contattare il Titolare tramite il form
    di contatto presente su matteocaputo.dev.
  </p>

  <h2>Dati trattati</h2>
  <ul>
    <li><strong>Contenuti e documenti</strong>: testo, titoli e note che crei nell'editor.</li>
    <li><strong>Dati tecnici</strong>: informazioni minime necessarie al funzionamento (ad esempio preferenze e stato dell'app).</li>
  </ul>

  <h2>Dove vengono salvati i dati</h2>
  <p>
    (t)ext salva i documenti <strong>in locale</strong> sul tuo dispositivo utilizzando la memoria del browser (localStorage)
    o lo storage equivalente in Electron. Il Titolare <strong>non riceve</strong> né conserva i tuoi contenuti su server remoti.
  </p>
  <p>
    Se usi le funzioni di <strong>Import</strong> o <strong>Export</strong>, i file vengono letti/scritti sul tuo computer tramite
    i normali strumenti del sistema operativo (se stai usando la versione Electron) o tramite download/upload del browser.
  </p>

  <h2>Cookie e strumenti equivalenti</h2>
  <p>
    (t)ext non usa cookie di profilazione né strumenti di tracciamento. Vengono usati solo <strong>strumenti tecnici</strong>
    (come localStorage) per memorizzare i documenti e l'ultimo stato dell'app.
  </p>
  <p>
    Puoi cancellare questi dati in qualsiasi momento eliminando i dati del sito/app dalle impostazioni del tuo browser o del sistema.
  </p>

  <h2>Base giuridica</h2>
  <p>
    Il trattamento è basato sull'esecuzione del servizio richiesto (fornire l'editor e salvare in locale i documenti)
    e, ove applicabile, sul legittimo interesse del Titolare a garantire sicurezza e corretto funzionamento.
  </p>

  <h2>Condivisione e trasferimenti</h2>
  <p>
    Il Titolare non condivide i tuoi contenuti con terze parti perché non vengono inviati a server.
    Se utilizzi la versione web, il provider di hosting potrebbe raccogliere log tecnici (es. IP, user-agent) per motivi
    di sicurezza e prestazioni: tali dati sono gestiti dal provider secondo le proprie policy.
  </p>

  <h2>Conservazione</h2>
  <p>
    I documenti restano sul tuo dispositivo finché non li cancelli dall'app o finché non elimini i dati del browser/app.
  </p>

  <h2>Diritti dell'interessato</h2>
  <p>
    In base al GDPR, hai diritto di ottenere accesso, rettifica, cancellazione, limitazione, opposizione e portabilità dei dati,
    nei limiti applicabili. Per esercitare i diritti puoi contattare il Titolare tramite il form su matteocaputo.dev.
  </p>

  <h2>Aggiornamenti</h2>
  <p>
    Questa informativa può essere aggiornata. La data di "Ultimo aggiornamento" indica la versione più recente.
  </p>
`;

function escapeSelectorValue(v) {
  return String(v).replace(/"/g, '\\"');
}

function hasReactLinkAlready() {
  return Boolean(document.querySelector('[data-legal="policy-link"]'));
}

function findFooterContainer() {
  // The footer contains a link to matteocaputo.dev; use it as an anchor to locate the container.
  const a = document.querySelector('a[href^="https://www.matteocaputo.dev"],a[href^="http://www.matteocaputo.dev"],a[href*="matteocaputo.dev"]');
  if (!a) return null;

  // Find the closest "footer-ish" container.
  let el = a;
  for (let i = 0; i < 6; i += 1) {
    if (!el || !el.parentElement) break;
    el = el.parentElement;
    const txt = (el.textContent || "").toLowerCase();
    if (txt.includes("(t)ext") && txt.includes("sviluppato")) {
      return el;
    }
  }
  // fallback: return the parent of the link
  return a.parentElement || null;
}

function openPolicyModal() {
  if (document.getElementById("text-policy-modal")) return;

  const overlay = document.createElement("div");
  overlay.id = "text-policy-modal";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Chiudi");
  backdrop.style.position = "absolute";
  backdrop.style.inset = "0";
  backdrop.style.background = "rgba(0,0,0,.72)";
  backdrop.style.border = "0";
  backdrop.style.padding = "0";
  backdrop.style.margin = "0";
  backdrop.addEventListener("click", () => overlay.remove());

  const panel = document.createElement("div");
  panel.className = "text-policy-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Cookie e Privacy Policy");
  panel.style.width = "min(860px, calc(100vw - 2rem))";
  panel.style.maxHeight = "min(70vh, 680px)";
  panel.style.overflow = "hidden";
  panel.style.borderRadius = "24px";
  panel.style.border = "1px solid rgba(255,255,255,.12)";
  panel.style.background = "rgba(10,10,10,.92)";
  panel.style.backdropFilter = "blur(18px)";
  panel.style.boxShadow = "0 30px 120px rgba(0,0,0,.55)";
  panel.style.position = "relative";

  panel.innerHTML = `
    <style>
      .text-policy-panel *{box-sizing:border-box;}
      .text-policy-panel h2{margin:18px 0 8px;font-size:14px;letter-spacing:.2px;}
      .text-policy-panel p{margin:0 0 10px;opacity:.88;}
      .text-policy-panel ul{margin:0 0 12px;padding-left:18px;opacity:.88;}
      .text-policy-panel li{margin:6px 0;}
      .text-policy-panel a{color:rgba(255,255,255,.92);}
    </style>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.10);">
      <div style="min-width:0;">
        <div style="font-size:15px;font-weight:650;color:rgba(255,255,255,.92);">Cookie &amp; Privacy Policy</div>
        <div style="margin-top:4px;font-size:12px;color:rgba(255,255,255,.55);">Ultimo aggiornamento: ${UPDATED_AT}</div>
      </div>
      <button id="text-policy-close" type="button" aria-label="Chiudi finestra" title="Chiudi"
        style="height:40px;width:40px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:rgba(255,255,255,.85);cursor:pointer;">
        ✕
      </button>
    </div>
    <div style="padding:16px 18px;overflow:auto;max-height:calc(min(70vh, 680px) - 72px);font-size:13px;line-height:1.6;color:rgba(255,255,255,.90);">
      ${POLICY_HTML}
    </div>
  `;

  overlay.appendChild(backdrop);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const closeBtn = panel.querySelector("#text-policy-close");
  if (closeBtn) closeBtn.addEventListener("click", () => overlay.remove());

  // Escape to close
  const onKey = (e) => {
    if (e.key === "Escape") {
      overlay.remove();
    }
  };
  window.addEventListener("keydown", onKey);
  const oldRemove = overlay.remove.bind(overlay);
  overlay.remove = () => {
    window.removeEventListener("keydown", onKey);
    oldRemove();
  };
}

function injectFooterLink() {
  if (hasReactLinkAlready()) return;
  if (document.getElementById("text-policy-link")) return;

  const container = findFooterContainer();
  if (!container) return;

  const row = document.createElement("div");
  row.style.marginTop = "6px";
  row.style.display = "flex";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "center";
  row.style.justifyContent = "center";
  row.style.gap = "10px";

  const btn = document.createElement("button");
  btn.id = "text-policy-link";
  btn.type = "button";
  btn.textContent = "Cookie & Privacy Policy";
  btn.style.background = "transparent";
  btn.style.border = "0";
  btn.style.padding = "0";
  btn.style.margin = "0";
  btn.style.cursor = "pointer";
  btn.style.font = "inherit";
  btn.style.fontSize = "12px";
  btn.style.color = "rgba(255,255,255,.55)";
  btn.style.textDecoration = "underline";
  btn.style.textDecorationColor = "rgba(255,255,255,.22)";
  btn.style.textUnderlineOffset = "4px";
  btn.addEventListener("mouseenter", () => (btn.style.color = "rgba(255,255,255,.92)"));
  btn.addEventListener("mouseleave", () => (btn.style.color = "rgba(255,255,255,.55)"));
  btn.addEventListener("click", openPolicyModal);

  row.appendChild(btn);
  container.appendChild(row);
}

function boot() {
  // First attempt quickly, then observe for late-mounted React content.
  injectFooterLink();

  const obs = new MutationObserver(() => {
    injectFooterLink();
    // Once injected (or React has its own link), we can stop observing.
    if (hasReactLinkAlready() || document.getElementById("text-policy-link")) {
      try { obs.disconnect(); } catch { /* ignore */ }
    }
  });

  try {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    // ignore
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
