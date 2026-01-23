import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Plus, Search, Trash2, X } from "lucide-react";
import type { Doc } from "../lib/types";
import { cn } from "../lib/utils";

type Props = {
  docs: Doc[];
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
};

export default function Sidebar({ docs, activeId, onClose, onSelect, onCreate, onDelete, onRename }: Props) {
  const isMac = (window.electronAPI?.platform === "darwin") || /Mac/i.test(navigator.platform);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return docs;
    return docs.filter(d => d.title.toLowerCase().includes(s) || d.content.toLowerCase().includes(s));
  }, [docs, q]);

  return (
    <>
      {/* Overlay */}
      <motion.button
        className="fixed inset-0 z-40 cursor-default bg-black/35 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-label="Close sidebar overlay"
      />

      <motion.aside
        className={cn(
          "fixed left-4 top-4 z-50 h-[calc(100%-2rem)] w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-glow backdrop-blur-2xl",
          // Avoid overlapping the macOS traffic-lights area
          isMac && "top-[64px]"
        )}
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -24, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-white/90">
              <FileText className="h-4 w-4 opacity-80" />
              Documenti
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-xl">
              <Search className="h-4 w-4 text-white/60" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca…"
                className="w-full bg-transparent text-sm text-white/90 outline-none placeholder:text-white/40"
              />
              <button
                onClick={onCreate}
                className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="New document"
                title="Nuovo documento"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-2 pb-3">
            <div className="space-y-2">
              {filtered.map((d) => (
                <DocRow
                  key={d.id}
                  doc={d}
                  active={d.id === activeId}
                  onSelect={() => onSelect(d.id)}
                  onDelete={() => onDelete(d.id)}
                  onRename={(title) => onRename(d.id, title)}
                />
              ))}
            </div>
          </div>

          <div className="px-4 pb-4 pt-2 text-xs text-white/45">
            Tip: <span className="text-white/70">Cmd/Ctrl+Enter</span> per creare un nuovo blocco.
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function DocRow({
  doc,
  active,
  onSelect,
  onDelete,
  onRename
}: {
  doc: Doc;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-xl transition",
        "hover:bg-white/10",
        active && "bg-white/12 ring-1 ring-white/10"
      )}
    >
      <button onClick={onSelect} className="absolute inset-0 rounded-2xl" aria-label={`Open ${doc.title}`} />
      <div className="relative flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-xl border border-white/10 bg-white/10 grid place-items-center", active && "bg-white/15")}>
          <FileText className="h-4 w-4 text-white/80" />
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              className="w-full bg-transparent text-sm font-medium text-white outline-none"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { setEditing(false); onRename(title); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
                if (e.key === "Escape") { setEditing(false); setTitle(doc.title); }
              }}
            />
          ) : (
            <div className="truncate text-sm font-medium text-white/90">{doc.title || "Untitled"}</div>
          )}
          <div className="truncate text-[11px] text-white/45">
            {new Date(doc.updatedAt).toLocaleString()}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            aria-label="Rename"
            title="Rinomina"
          >
            <span className="text-[11px] font-medium">Aa</span>
          </button>
          <button
            className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            aria-label="Delete"
            title="Elimina"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
