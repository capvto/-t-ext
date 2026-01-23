import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import { uid } from "./lib/utils";
import type { Doc } from "./lib/types";
import { useDebouncedCallback } from "./hooks/useDebouncedCallback";

const STORAGE_KEY = "glass-md-editor:v1";
// Used to avoid accumulating an endless list of "empty" startup documents.
// We remove the previous untouched startup doc on the next launch, then create a fresh one.
const FRESH_DOC_KEY = "glass-md-editor:freshDocId";

function nowISO() {
  return new Date().toISOString();
}

function emptyDoc(): Doc {
  return {
    id: uid(),
    title: "Untitled",
    content: "",
    updatedAt: nowISO()
  };
}

function seedDoc(): Doc {
  // Fallback doc (e.g. if the user deletes everything)
  return emptyDoc();
}

function loadDocs(): { docs: Doc[]; activeId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let docs: Doc[] = [];
    let activeId = "";

    if (raw) {
      const parsed = JSON.parse(raw) as { docs: Doc[]; activeId: string };
      if (parsed?.docs?.length) {
        docs = parsed.docs;
        const activeExists = parsed.docs.some(d => d.id === parsed.activeId);
        activeId = activeExists ? parsed.activeId : parsed.docs[0].id;
      }
    }

    // Always start on a brand new document.
    // If the previous session's "startup" doc was never touched, remove it first.
    try {
      const prevFreshId = localStorage.getItem(FRESH_DOC_KEY);
      if (prevFreshId) {
        const idx = docs.findIndex(d => d.id === prevFreshId);
        if (idx >= 0) {
          const d = docs[idx];
          const untouched = (d.title?.trim() || "Untitled") === "Untitled" && (d.content ?? "") === "";
          if (untouched) docs.splice(idx, 1);
        }
      }
      const fresh = emptyDoc();
      localStorage.setItem(FRESH_DOC_KEY, fresh.id);
      return { docs: [fresh, ...docs], activeId: fresh.id };
    } catch {
      // If anything goes wrong, fall back to the stored active doc.
      if (!docs.length) {
        const d = seedDoc();
        return { docs: [d], activeId: d.id };
      }
      return { docs, activeId: activeId || docs[0].id };
    }
  } catch {
    const d = seedDoc();
    return { docs: [d], activeId: d.id };
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

export default function App() {
  const initial = useMemo(loadDocs, []);
  const [docs, setDocs] = useState<Doc[]>(initial.docs);
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Keep latest state in refs so native menu handlers (registered once)
  // always act on the current active document.
  const docsRef = useRef<Doc[]>(docs);
  const activeIdRef = useRef<string>(activeId);
  useEffect(() => {
    docsRef.current = docs;
    activeIdRef.current = activeId;
  }, [docs, activeId]);

  // Persist to localStorage (debounced)
  const persist = useDebouncedCallback((nextDocs: Doc[], nextActiveId: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs: nextDocs, activeId: nextActiveId }));
  }, 250);

  // Single theme (dark). We intentionally removed the light/dark toggle.
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    persist(docs, activeId);
  }, [docs, activeId, persist]);

  const activeDoc = useMemo(() => docs.find(d => d.id === activeId) ?? docs[0], [docs, activeId]);

  const getActiveDoc = () => {
    const list = docsRef.current;
    const id = activeIdRef.current;
    return list.find(d => d.id === id) ?? list[0];
  };

  function createDoc() {
    const d: Doc = { id: uid(), title: "Untitled", content: "", updatedAt: nowISO() };
    setDocs(prev => [d, ...prev]);
    setActiveId(d.id);
    setSidebarOpen(false);
  }

  function deleteDoc(id: string) {
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
    setDocs(prev => prev.map(d => (d.id === id ? { ...d, title: title.trim() || "Untitled", updatedAt: nowISO() } : d)));
  }

  function updateDocContent(id: string, content: string) {
    setDocs(prev => prev.map(d => (d.id === id ? { ...d, content, updatedAt: nowISO() } : d)));
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
        "relative h-screen w-screen overflow-hidden " +
        "bg-zinc-950 text-zinc-50"
      }
    >
      {/* Neutral (non-color) background highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)]" />

      <AnimatePresence>
        {sidebarOpen && (
          <Sidebar
            key="sidebar"
            docs={docs}
            activeId={activeId}
            onClose={() => setSidebarOpen(false)}
            onSelect={(id) => {
              setActiveId(id);
              setSidebarOpen(false);
            }}
            onCreate={createDoc}
            onDelete={deleteDoc}
            onRename={renameDoc}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen main surface */}
      <motion.div
        className={
          "relative flex h-full w-full flex-col overflow-hidden " +
          "border border-white/10 bg-white/6 backdrop-blur-2xl"
        }
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white/6 to-transparent" />
        </div>

        <Editor
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          doc={activeDoc}
          onUpdateContent={(content) => updateDocContent(activeDoc.id, content)}
          onRename={(title) => renameDoc(activeDoc.id, title)}
          onCreateDoc={createDoc}
          onExport={exportActive}
          onImport={importIntoActive}
        />
      </motion.div>
    </div>
  );
}
