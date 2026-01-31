import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import PublicPastePage from "./components/PublicPastePage";
import PublicPasteClassicEditorPage from "./components/PublicPasteClassicEditorPage";
import { uid } from "./lib/utils";
import { STARTUP_DOC_ID, STARTUP_DOC_TITLE } from "./lib/constants";
import type { Doc } from "./lib/types";
import { useDebouncedCallback } from "./hooks/useDebouncedCallback";
import { scopeCss } from "./lib/cssScope";
import { APP_FONTS, APP_MONO_FONTS } from "./lib/appFonts";
import { idbGet, idbSet } from "./lib/persistence";

const STORAGE_KEY = "glass-md-editor:v1";
const GLOBAL_SETTINGS_KEY = "glass-md-editor:globalSettings:v1";

function nowISO() {
  return new Date().toISOString();
}

function emptyDoc(): Doc {
  return {
    id: uid(),
    title: "Untitled",
    content: "",
    updatedAt: nowISO(),
    importedFrom: "",
    importedAt: "",
    customCss: "",
    markdownPlugins: []
  };
}


function startupDoc(existing?: Doc): Doc {
  const existingTitle = (existing?.title ?? "").trim();
  const existingContent = existing?.content ?? "";
  const needsReset = (existingTitle !== "" && existingTitle !== STARTUP_DOC_TITLE) || existingContent !== "";

  return {
    id: STARTUP_DOC_ID,
    title: STARTUP_DOC_TITLE,
    content: "",
    updatedAt: needsReset ? nowISO() : (existing?.updatedAt ?? nowISO()),
    importedFrom: "",
    importedAt: "",
    // Keep per-note settings if the user customized them for the startup note.
    customCss: existing?.customCss ?? "",
    markdownPlugins: existing?.markdownPlugins ?? []
  };
}

function ensureStartupDoc(list: Doc[]): Doc[] {
  const existing = list.find((d) => d.id === STARTUP_DOC_ID);
  const rest = list.filter((d) => d.id !== STARTUP_DOC_ID);
  return [startupDoc(existing), ...rest];
}


function seedDoc(): Doc {
  // Fallback doc (e.g. if the user deletes everything)
  return startupDoc();
}

function loadDocs(): { docs: Doc[]; activeId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as { docs?: Doc[]; activeId?: string };
      const parsedDocs = Array.isArray(parsed?.docs) ? parsed.docs : [];

      if (parsedDocs.length) {
        // Migrate older docs (missing newer fields)
        const migrated = parsedDocs.map((d) => ({
          ...d,
          importedFrom: (d as any).importedFrom ?? "",
          importedAt: (d as any).importedAt ?? "",
          customCss: (d as any).customCss ?? "",
          markdownPlugins: (d as any).markdownPlugins ?? []
        }));

        const docs = ensureStartupDoc(migrated);
        return { docs, activeId: STARTUP_DOC_ID };
      }
    }

    const d = seedDoc();
    return { docs: [d], activeId: d.id };
  } catch {
    const d = seedDoc();
    return { docs: [d], activeId: d.id };
  }
}

type GlobalSettings = { css: string; themeId: string; fontId: string; monoFontId: string; blocksEnabled: boolean };

function loadGlobalSettings(): GlobalSettings {
  try {
    const raw = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (!raw) return { css: "", themeId: "default", fontId: "default", monoFontId: "default", blocksEnabled: false };
    const parsed = JSON.parse(raw) as Partial<GlobalSettings> & { fontId?: string; monoFontId?: string };
    return {
      css: typeof parsed.css === "string" ? parsed.css : "",
      themeId: typeof parsed.themeId === "string" ? parsed.themeId : "default",
      fontId: typeof parsed.fontId === "string" ? parsed.fontId : "default",
      monoFontId: typeof parsed.monoFontId === "string" ? parsed.monoFontId : "default",
      blocksEnabled: typeof (parsed as any).blocksEnabled === "boolean" ? (parsed as any).blocksEnabled : false
    };
  } catch {
    return { css: "", themeId: "default", fontId: "default", monoFontId: "default", blocksEnabled: false };
  }
}

function sanitizeBaseName(name: string) {
  const safe = (name || "document")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  return safe || "document";
}

function fileNameFromPath(p?: string | null) {
  if (!p) return "";
  const norm = p.replace(/\\/g, "/");
  return norm.split("/").pop() || "";
}

function fireAndForget(p: any) {
  try {
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  } catch {
    // ignore
  }
}

function safeLsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export default function App() {
  const initial = useMemo(loadDocs, []);
  const initialGlobal = useMemo(loadGlobalSettings, []);
  const [docs, setDocs] = useState<Doc[]>(initial.docs);
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  // When pinned, the sidebar behaves like a normal toggle (stays open until closed).
  // When not pinned, it can be revealed by hovering the left edge and auto-closes on leave.
  const [sidebarPinned, setSidebarPinned] = useState<boolean>(false);
  const hoverTriggerRef = useRef(false);
  const hoverSidebarRef = useRef(false);
  const hoverCloseTimerRef = useRef<number | null>(null);

  const clearHoverCloseTimer = () => {
    if (hoverCloseTimerRef.current != null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  const scheduleHoverClose = () => {
    if (sidebarPinned) return;
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      if (!hoverTriggerRef.current && !hoverSidebarRef.current) {
        setSidebarOpen(false);
      }
    }, 180);
  };

  const toggleSidebar = () => {
    // If it's already open via hover, a click should pin it open.
    if (sidebarOpen && !sidebarPinned) {
      setSidebarPinned(true);
      return;
    }
    const next = !sidebarOpen;
    setSidebarOpen(next);
    setSidebarPinned(next);
  };



// Hydrate docs from the most reliable storage available.
// - Electron: JSON file in userData via IPC (kv:*).
// - Web: IndexedDB (fallback: localStorage).
useEffect(() => {
  let cancelled = false;

  const hydrate = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as { docs?: Doc[]; activeId?: string };
      const parsedDocs = Array.isArray(parsed?.docs) ? parsed.docs : [];
      if (!parsedDocs.length || cancelled) return;

      const docsHydrated = parsedDocs.map((d) => ({
        ...d,
        importedFrom: (d as any).importedFrom ?? "",
        importedAt: (d as any).importedAt ?? "",
        customCss: (d as any).customCss ?? "",
        markdownPlugins: (d as any).markdownPlugins ?? []
      }));
      const normalized = ensureStartupDoc(docsHydrated);
      setDocs(normalized);
      setActiveId(STARTUP_DOC_ID);
    } catch {
      // ignore
    }
  };

  (async () => {
    // 1) Electron KV store (preferred in the desktop app)
    try {
      const rawElectron = window.electronAPI?.kvGet ? await window.electronAPI.kvGet(STORAGE_KEY) : null;
      if (rawElectron) {
        hydrate(rawElectron);
        // Mirror to web stores (best effort) so dev builds still behave consistently.
        safeLsSet(STORAGE_KEY, rawElectron);
        fireAndForget(idbSet(STORAGE_KEY, rawElectron));
        return;
      }
    } catch {
      // ignore
    }

    // 2) IndexedDB
    try {
      const rawIdb = await idbGet(STORAGE_KEY);
      if (rawIdb) {
        hydrate(rawIdb);
        // Mirror to Electron store and localStorage (best effort).
        safeLsSet(STORAGE_KEY, rawIdb);
        fireAndForget(window.electronAPI?.kvSet?.(STORAGE_KEY, rawIdb));
        return;
      }
    } catch {
      // ignore
    }

    // 3) localStorage (fallback)
    const rawLs = safeLsGet(STORAGE_KEY);
    if (rawLs) {
      hydrate(rawLs);
      fireAndForget(idbSet(STORAGE_KEY, rawLs));
      fireAndForget(window.electronAPI?.kvSet?.(STORAGE_KEY, rawLs));
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);


  type PublicRoute = { kind: "view" | "edit"; id: string } | null;

  const decodeSeg = (seg: string) => {
    try {
      return decodeURIComponent(seg || "");
    } catch {
      return seg || "";
    }
  };

  const getPublicRouteFromPathname = (pathname: string): PublicRoute => {
    const p = String(pathname || "");

    // Edit routes (checked first so /p/:id/edit doesn't get parsed as view).
    const mEditLegacy = p.match(/^\/p\/([^\/?#]+)\/edit\/?$/);
    if (mEditLegacy) return { kind: "edit", id: decodeSeg(mEditLegacy[1] || "") };

    const mEditPrefix = p.match(/^\/edit\/([^\/?#]+)\/?$/);
    if (mEditPrefix) return { kind: "edit", id: decodeSeg(mEditPrefix[1] || "") };

    const mEditRoot = p.match(/^\/([^\/?#]+)\/edit\/?$/);
    if (mEditRoot) {
      const seg = decodeSeg(mEditRoot[1] || "");
      const reserved = new Set(["p", "edit", "assets", "api", "favicon.ico", "robots.txt", "sitemap.xml", "index.html"]);
      if (seg && !reserved.has(seg) && !seg.startsWith(".")) return { kind: "edit", id: seg };
      return null;
    }

    // View routes.
    const mLegacy = p.match(/^\/p\/([^\/?#]+)/);
    if (mLegacy) return { kind: "view", id: decodeSeg(mLegacy[1] || "") };

    // New route: /:slug
    const mRoot = p.match(/^\/([^\/?#]+)\/?$/);
    if (!mRoot) return null;

    const seg = decodeSeg(mRoot[1] || "");
    const reserved = new Set(["p", "edit", "assets", "api", "favicon.ico", "robots.txt", "sitemap.xml", "index.html"]);
    if (!seg) return null;
    if (reserved.has(seg)) return null;
    if (seg.startsWith(".")) return null;

    return { kind: "view", id: seg };
  };

  const [publicRoute, setPublicRoute] = useState<PublicRoute>(() => {
    try {
      return getPublicRouteFromPathname(window.location.pathname);
    } catch {
      return null;
    }
  });

  const navigate = (path: string) => {
    try {
      window.history.pushState({}, "", path);
    } catch {
      // ignore
    }
    setPublicRoute(getPublicRouteFromPathname(path));
  };

  useEffect(() => {
    const onPop = () => {
      try {
        setPublicRoute(getPublicRouteFromPathname(window.location.pathname));
      } catch {
        setPublicRoute(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In public (view/edit) routes we disable the local Documents sidebar entirely.
  // This avoids having two different interfaces and prevents hover/overlay layers
  // from interfering with interactions on Safari/WebView.
  useEffect(() => {
    if (!publicRoute) return;
    clearHoverCloseTimer();
    hoverTriggerRef.current = false;
    hoverSidebarRef.current = false;
    setSidebarOpen(false);
    setSidebarPinned(false);
  }, [publicRoute]);





  const [appCss, setAppCss] = useState<string>(initialGlobal.css);
  const [appThemeId, setAppThemeId] = useState<string>(initialGlobal.themeId);
  const [appFontId, setAppFontId] = useState<string>(initialGlobal.fontId);
  const [appMonoFontId, setAppMonoFontId] = useState<string>(initialGlobal.monoFontId);
  const [appBlocksEnabled, setAppBlocksEnabled] = useState<boolean>(!!initialGlobal.blocksEnabled);


// Hydrate global settings from Electron KV store (if available).
// This makes personalization persist reliably in the desktop app even if
// browser storage is unavailable.
useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const rawElectron = window.electronAPI?.kvGet ? await window.electronAPI.kvGet(GLOBAL_SETTINGS_KEY) : null;
      if (!rawElectron) {
        const rawLs = safeLsGet(GLOBAL_SETTINGS_KEY);
        if (rawLs) fireAndForget(window.electronAPI?.kvSet?.(GLOBAL_SETTINGS_KEY, rawLs));
        return;
      }
      if (cancelled) return;

      const parsed = JSON.parse(rawElectron) as Partial<GlobalSettings> & { fontId?: string; monoFontId?: string };
      setAppCss(typeof parsed.css === "string" ? parsed.css : "");
      setAppThemeId(typeof parsed.themeId === "string" ? parsed.themeId : "default");
      setAppFontId(typeof parsed.fontId === "string" ? parsed.fontId : "default");
      setAppMonoFontId(typeof parsed.monoFontId === "string" ? parsed.monoFontId : "default");
      setAppBlocksEnabled(typeof (parsed as any).blocksEnabled === "boolean" ? (parsed as any).blocksEnabled : false);

      // Mirror to localStorage for consistency (best effort).
      safeLsSet(GLOBAL_SETTINGS_KEY, rawElectron);
    } catch {
      // ignore
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);

  const scopedAppCss = useMemo(() => {
    const c = (appCss || "").trim();
    if (!c) return "";
    return scopeCss(c, ".app-root");
  }, [appCss]);

  const appFontCss = useMemo(() => {
    const ui = APP_FONTS.find((f) => f.id === appFontId) ?? APP_FONTS[0];
    const mono = APP_MONO_FONTS.find((f) => f.id === appMonoFontId) ?? APP_MONO_FONTS[0];

    let css = "";
    if (ui?.family) {
      css += `.app-root { font-family: ${ui.family} !important; }\n`;
    }
    if (mono?.family) {
      css += `.app-root code, .app-root pre, .app-root .font-mono { font-family: ${mono.family} !important; }\n`;
    }
    return css.trim();
  }, [appFontId, appMonoFontId]);


  // Keep latest state in refs so native menu handlers (registered once)
  // always act on the current active document.
  const docsRef = useRef<Doc[]>(docs);
  const activeIdRef = useRef<string>(activeId);
  useEffect(() => {
    docsRef.current = docs;
    activeIdRef.current = activeId;
  }, [docs, activeId]);

  

// Flush persistence on reload/close so we don't lose the last edits
// if the debounce hasn't fired yet (common during refresh).
useEffect(() => {
  const flush = () => {
    try {
      const payload = JSON.stringify({ docs: docsRef.current, activeId: activeIdRef.current });
      safeLsSet(STORAGE_KEY, payload);
      fireAndForget(idbSet(STORAGE_KEY, payload));
      fireAndForget(window.electronAPI?.kvSet?.(STORAGE_KEY, payload));
    } catch {
      // ignore
    }
  };

  window.addEventListener("beforeunload", flush);
  window.addEventListener("pagehide", flush);
  return () => {
    window.removeEventListener("beforeunload", flush);
    window.removeEventListener("pagehide", flush);
  };
}, []);



// Persist the editor state (debounced)
const persist = useDebouncedCallback((nextDocs: Doc[], nextActiveId: string) => {
  const payload = JSON.stringify({ docs: nextDocs, activeId: nextActiveId });

  // Browser storage (best effort)
  safeLsSet(STORAGE_KEY, payload);
  fireAndForget(idbSet(STORAGE_KEY, payload));

  // Electron storage (best effort)
  fireAndForget(window.electronAPI?.kvSet?.(STORAGE_KEY, payload));
}, 250);


  // Single theme (dark). We intentionally removed the light/dark toggle.
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    persist(docs, activeId);
  }, [docs, activeId, persist]);



// Persist global personalization (CSS / theme / fonts / block mode) separately.
useEffect(() => {
  const payload = JSON.stringify({ css: appCss, themeId: appThemeId, fontId: appFontId, monoFontId: appMonoFontId, blocksEnabled: appBlocksEnabled });
  safeLsSet(GLOBAL_SETTINGS_KEY, payload);
  fireAndForget(window.electronAPI?.kvSet?.(GLOBAL_SETTINGS_KEY, payload));
}, [appCss, appThemeId, appFontId, appMonoFontId, appBlocksEnabled]);

  const activeDoc = useMemo(() => docs.find(d => d.id === activeId) ?? docs[0], [docs, activeId]);

  const getActiveDoc = () => {
    const list = docsRef.current;
    const id = activeIdRef.current;
    return list.find(d => d.id === id) ?? list[0];
  };

  function createDoc() {
    const d: Doc = {
      id: uid(),
      title: "Untitled",
      content: "",
      updatedAt: nowISO(),
      importedFrom: "",
      importedAt: "",
      customCss: "",
      markdownPlugins: []
    };
    setDocs(prev => {
      if (prev.length && prev[0]?.id === STARTUP_DOC_ID) {
        return [prev[0], d, ...prev.slice(1)];
      }
      return [d, ...prev];
    });
    setActiveId(d.id);
    setSidebarOpen(false);
  }

  function deleteDoc(id: string) {
    if (id === STARTUP_DOC_ID) return;
    setDocs(prev => {
      const next = prev.filter(d => d.id !== id);
      if (next.length === 0) {
        const d = seedDoc();
        setActiveId(d.id);
        return [d];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  function renameDoc(id: string, title: string) {
    if (id === STARTUP_DOC_ID) return;
    setDocs(prev => prev.map(d => (d.id === id ? { ...d, title: title.trim() || "Untitled", updatedAt: nowISO() } : d)));
  }


function updateDocContent(id: string, content: string) {
  const nextContent = String(content ?? "");

  // The startup document exists to guarantee the app opens on a blank note.
  // As soon as the user starts typing, we materialize it into a real document
  // so the content is persisted like any other note.
  if (id === STARTUP_DOC_ID) {
    const shouldMaterialize = nextContent.trim() !== "";
    if (shouldMaterialize) {
      const now = nowISO();
      const d: Doc = {
        id: uid(),
        title: "Untitled",
        content: nextContent,
        updatedAt: now,
        importedFrom: "",
        importedAt: "",
        customCss: "",
        markdownPlugins: []
      };

      setDocs(prev => {
        const existingStartup = prev.find((x) => x.id === STARTUP_DOC_ID);
        const startup = startupDoc(existingStartup);
        const rest = prev.filter((x) => x.id !== STARTUP_DOC_ID);
        return [startup, d, ...rest];
      });
      setActiveId(d.id);
      setSidebarOpen(false);
      return;
    }

    // Keep it truly empty (avoid saving whitespace)
    setDocs(prev => prev.map(d => (d.id === STARTUP_DOC_ID ? { ...d, content: "", updatedAt: nowISO() } : d)));
    return;
  }

  setDocs(prev => prev.map(d => (d.id === id ? { ...d, content: nextContent, updatedAt: nowISO() } : d)));
}

  function updateDocSettings(id: string, patch: Pick<Doc, "customCss" | "markdownPlugins">) {
    setDocs(prev =>
      prev.map(d =>
        d.id === id
          ? {
              ...d,
              customCss: patch.customCss ?? d.customCss ?? "",
              markdownPlugins: patch.markdownPlugins ?? d.markdownPlugins ?? [],
              updatedAt: nowISO()
            }
          : d
      )
    );
  }

  function savePublicPasteAsDoc(payload: { title: string; content: string; sourceUrl: string }) {
    const sourceUrl = (payload.sourceUrl || "").trim();
    const existing = sourceUrl ? docsRef.current.find((d) => (d.importedFrom || "") === sourceUrl) : undefined;
    if (existing) {
      setActiveId(existing.id);
      setSidebarOpen(false);
      navigate("/");
      return;
    }

    const now = nowISO();
    const d: Doc = {
      id: uid(),
      title: (payload.title || "").trim() || "Untitled",
      content: payload.content || "",
      updatedAt: now,
      importedFrom: sourceUrl,
      importedAt: now,
      customCss: "",
      markdownPlugins: []
    };

    const cur = docsRef.current;
    const next = cur.length ? [cur[0], d, ...cur.slice(1)] : [d];

    setDocs(next);
    setActiveId(d.id);
    setSidebarOpen(false);
    persist(next, d.id);
    navigate("/");
  }

  async function exportDoc(doc: Doc) {
    const filename = `${sanitizeBaseName(doc.title)}.md`;

    // Electron (native save dialog)
    if (window.electronAPI?.saveMarkdown) {
      await window.electronAPI.saveMarkdown(filename, doc.content);
      return;
    }

    // Browser fallback (download)
    const blob = new Blob([doc.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportActive() {
    const doc = getActiveDoc();
    if (!doc) return;
    await exportDoc(doc);
  }

  function importIntoDoc(docId: string, currentTitle: string, text: string, sourcePathOrName?: string) {
    updateDocContent(docId, text);

    const incomingName = fileNameFromPath(sourcePathOrName);
    if (incomingName) {
      const base = incomingName.replace(/\.(md|markdown|txt)$/i, "");
      const current = (currentTitle || "").trim();
      if (!current || current === "Untitled") {
        renameDoc(docId, base);
      }
    }
  }

  function importIntoActive(text: string, sourcePathOrName?: string) {
    const doc = getActiveDoc();
    if (!doc) return;
    importIntoDoc(doc.id, doc.title, text, sourcePathOrName);
  }

  // Native menu bar actions (macOS menubar / Windows/Linux app menu).
  // Prefer listening to the DOM CustomEvent emitted by the preload script.
  useEffect(() => {
    const eventName = window.electronAPI?.menuEventName || "text:menu-action";

    const handleAction = async (action: string) => {
      if (!action) return;

      if (action === "file:new") {
        createDoc();
        return;
      }

      if (action === "file:import") {
        const res = await window.electronAPI?.openMarkdown?.();
        if (res?.content != null) {
          const doc = getActiveDoc();
          if (doc) importIntoDoc(doc.id, doc.title, res.content, res.filePath);
        }
        return;
      }

      if (action === "file:export" || action === "file:exportAs") {
        const doc = getActiveDoc();
        if (doc) await exportDoc(doc);
      }
    };

    const handler = (e: Event) => {
      const action = (e as CustomEvent)?.detail;
      if (typeof action === "string") {
        void handleAction(action);
      }
    };

    // Extra fallback: preload also posts a window message so actions can cross
    // isolated worlds even if CustomEvent listeners behave oddly on some builds.
    const messageHandler = (e: MessageEvent) => {
      const data: any = e.data;
      if (data?.type === eventName && typeof data.action === "string") {
        void handleAction(data.action);
      }
    };

    window.addEventListener(eventName, handler as EventListener);
    window.addEventListener("message", messageHandler as EventListener);

    // Back-compat: if an older preload only supports the callback API, bridge it
    // to the DOM event so the same handler still runs.
    const unsubscribe = window.electronAPI?.onMenuAction?.((a) => {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail: a }));
      } catch {
        // ignore
      }
    });

    return () => {
      window.removeEventListener(eventName, handler as EventListener);
      window.removeEventListener("message", messageHandler as EventListener);
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={
        "relative h-screen w-screen overflow-hidden app-root " +
        "bg-zinc-950 text-zinc-50"
      }
    >
      {appFontCss ? <style>{appFontCss}</style> : null}
      {scopedAppCss ? <style>{scopedAppCss}</style> : null}
      {/* Neutral (non-color) background highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)]" />

      {!publicRoute ? (
      <>
        {/* Hover hotspot: moving the pointer to the left edge reveals the Documents sidebar */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 z-30 h-full w-3"
          onMouseEnter={() => {
            hoverTriggerRef.current = true;
            clearHoverCloseTimer();
            if (!sidebarPinned) setSidebarOpen(true);
          }}
          onMouseLeave={() => {
            hoverTriggerRef.current = false;
            scheduleHoverClose();
          }}
        />

        <AnimatePresence>
          {sidebarOpen && (
            <Sidebar
              key="sidebar"
              docs={docs}
              activeId={activeId}
              blocksEnabled={appBlocksEnabled}
              onClose={() => {
                setSidebarOpen(false);
                setSidebarPinned(false);
              }}
              onSelect={(id) => {
                setActiveId(id);
                setSidebarOpen(false);
                setSidebarPinned(false);
              }}
              onCreate={createDoc}
              onDelete={deleteDoc}
              onRename={renameDoc}
              onHoverChange={(hovering) => {
                hoverSidebarRef.current = hovering;
                if (!hovering) scheduleHoverClose();
                else clearHoverCloseTimer();
              }}
            />
          )}
        </AnimatePresence>
      </>
    ) : null}

      {/* Fullscreen main surface */}
      <motion.div
        className={
          // `min-h-0` is critical in nested flex layouts so inner `overflow-auto`
          // containers can actually scroll instead of expanding the parent.
          "relative flex h-full w-full min-h-0 flex-col overflow-hidden " +
          "border border-white/10 bg-white/6 " +
          // In public (view/edit) routes we avoid the heavier backdrop blur on the
          // fullscreen surface. Besides matching the intended look, this also helps
          // Safari/WebView hit-testing stability.
          (publicRoute ? "" : "backdrop-blur-2xl")
        }
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white/6 to-transparent" />
        </div>
	      {publicRoute?.kind === "view" ? (
        <PublicPastePage
          id={publicRoute.id}
          onGoHome={() => navigate("/")}
          onGoEdit={(editId) => navigate(`/edit/${encodeURIComponent(editId)}`)}
          onSaveToText={(p) => savePublicPasteAsDoc(p)}
        />
      ) : publicRoute?.kind === "edit" ? (
        <PublicPasteClassicEditorPage
          id={publicRoute.id}
          onGoHome={() => navigate("/")}
          onGoView={(viewId) => navigate(`/${encodeURIComponent(viewId)}`)}
          appCss={appCss}
          appThemeId={appThemeId}
          appFontId={appFontId}
          appMonoFontId={appMonoFontId}
          appBlocksEnabled={appBlocksEnabled}
          onUpdateAppSettings={({ css, themeId, fontId, monoFontId, blocksEnabled }) => {
            setAppCss(css ?? "");
            setAppThemeId(themeId ?? "default");
            setAppFontId(fontId ?? "default");
            setAppMonoFontId(monoFontId ?? "default");
            setAppBlocksEnabled(!!blocksEnabled);
          }}
        />
      ) : (
        <Editor
	          sidebarOpen={sidebarOpen}
	          onToggleSidebar={toggleSidebar}
	          doc={activeDoc}
	          onUpdateContent={(content) => updateDocContent(activeDoc.id, content)}
	          onRename={(title) => renameDoc(activeDoc.id, title)}
	          onUpdateSettings={(patch) => updateDocSettings(activeDoc.id, patch)}
	          onCreateDoc={createDoc}
	          onExport={exportActive}
	          onImport={importIntoActive}
	          appCss={appCss}
	          appThemeId={appThemeId}
	          appFontId={appFontId}
	          appMonoFontId={appMonoFontId}
	          appBlocksEnabled={appBlocksEnabled}
	          onUpdateAppSettings={({ css, themeId, fontId, monoFontId, blocksEnabled }) => {
	            setAppCss(css ?? "");
	            setAppThemeId(themeId ?? "default");
	            setAppFontId(fontId ?? "default");
	            setAppMonoFontId(monoFontId ?? "default");
	            setAppBlocksEnabled(!!blocksEnabled);
	          }}
	        />
	      )}
      </motion.div>
    </div>
  );
}
