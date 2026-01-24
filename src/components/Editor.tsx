import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie, Download, LayoutGrid, Plus, Upload } from "lucide-react";
import type { Doc } from "../lib/types";
import { cn, uid } from "../lib/utils";
import MarkdownBlock from "./MarkdownBlock";
import PolicyModal from "./PolicyModal";
import CookieBanner from "./CookieBanner";
import { useInertialScroll } from "../hooks/useInertialScroll";
import { useI18n } from "../i18n";

type Props = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  doc: Doc;
  onUpdateContent: (content: string) => void;
  onRename: (title: string) => void;
  onCreateDoc: () => void;
  onExport: () => void;
  onImport: (text: string, sourcePathOrName?: string) => void;
};

type Block = { id: string; text: string };

function splitBlocks(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n");
  // Split on two or more newlines, but keep single newlines inside blocks.
  const parts = normalized.split(/\n{2,}/g);
  // Keep at least one block
  return parts.length ? parts : [""];
}

function joinBlocks(blocks: Block[]): string {
  return blocks.map(b => b.text).join("\n\n");
}

export default function Editor({
  sidebarOpen,
  onToggleSidebar,
  doc,
  onUpdateContent,
  onRename,
  onCreateDoc,
  onExport,
  onImport
}: Props) {
  const { t, lang, setLang } = useI18n();
  const isMac = (window.electronAPI?.platform === "darwin") || /Mac/i.test(navigator.platform);
  const [title, setTitle] = useState(doc.title);
  const [blocks, setBlocks] = useState<Block[]>(() => splitBlocks(doc.content).map((t, i) => ({ id: `${doc.id}:${i}:${uid().slice(0, 8)}`, text: t })));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);

  // Tracks the last content we pushed upward via `onUpdateContent`.
  // If `doc.content` changes and it doesn't match this ref, it means the parent
  // updated the document externally (e.g. Import) and we must rehydrate blocks.
  const lastPushedContentRef = useRef<string>(doc.content);

  const scrollRef = useInertialScroll<HTMLDivElement>();
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  // When switching docs, rehydrate blocks
  useEffect(() => {
    setTitle(doc.title);
    const parts = splitBlocks(doc.content);
    setBlocks(parts.map((t, i) => ({ id: `${doc.id}:${i}:${uid().slice(0, 8)}`, text: t })));
    setActiveBlockId(null);
    lastPushedContentRef.current = doc.content;
  }, [doc.id]); // intentionally only on doc switch

  // If the current doc's content is replaced from outside this component
  // (e.g. Import from the native menu), update our block state so the user
  // immediately sees the new text. Without this, Import looks like it "doesn't work".
  useEffect(() => {
    if (doc.content === lastPushedContentRef.current) return;
    const parts = splitBlocks(doc.content);
    setBlocks(parts.map((t, i) => ({ id: `${doc.id}:${i}:${uid().slice(0, 8)}`, text: t })));
    setActiveBlockId(null);
    lastPushedContentRef.current = doc.content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.content, doc.id]);

  // Keep content in sync
  useEffect(() => {
    const merged = joinBlocks(blocks);
    lastPushedContentRef.current = merged;
    onUpdateContent(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // Title sync (debounced-ish via onBlur)
  useEffect(() => setTitle(doc.title), [doc.title]);

  const docStats = useMemo(() => {
    const chars = joinBlocks(blocks).length;
    const words = joinBlocks(blocks).trim().split(/\s+/).filter(Boolean).length;
    return { chars, words };
  }, [blocks]);

  function updateBlock(id: string, nextText: string) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, text: nextText } : b));
  }

  function splitBlockAtCursor(id: string, cursor: number) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const text = prev[idx].text;
      const a = text.slice(0, cursor);
      const b = text.slice(cursor);
      const next: Block[] = [...prev];
      next.splice(idx, 1, { ...prev[idx], text: a }, { id: `${doc.id}:${Date.now()}:${uid().slice(0, 8)}`, text: b });
      // Activate the new one on next tick
      queueMicrotask(() => setActiveBlockId(next[idx + 1].id));
      return next;
    });
  }

  function mergeWithPrevious(id: string) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx <= 0) return prev;
      const a = prev[idx - 1].text;
      const b = prev[idx].text;
      // If the current block is empty, removing it should not mutate the previous block.
      const merged = b.trim() === "" ? a : (a + "\n" + b).replace(/^\n+/, "");
      const next = [...prev];
      next.splice(idx - 1, 2, { ...prev[idx - 1], text: merged });
      queueMicrotask(() => setActiveBlockId(next[idx - 1].id));
      return next;
    });
  }

  function deleteBlock(id: string) {
    const wasActive = activeBlockId === id;
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;

      // Always keep at least one block.
      if (prev.length === 1) {
        const cleared = [{ ...prev[0], text: "" }];
        if (wasActive) queueMicrotask(() => setActiveBlockId(cleared[0].id));
        return cleared;
      }

      const next = [...prev];
      next.splice(idx, 1);

      if (wasActive) {
        const target = next[Math.min(idx, next.length - 1)]?.id ?? next[next.length - 1]?.id ?? null;
        queueMicrotask(() => setActiveBlockId(target));
      }

      return next;
    });
  }

  function addEmptyBlock(afterId?: string) {
    setBlocks(prev => {
      const next = [...prev];
      const newBlock: Block = { id: `${doc.id}:${Date.now()}:${uid().slice(0, 8)}`, text: "" };
      if (!afterId) next.push(newBlock);
      else {
        const idx = next.findIndex(b => b.id === afterId);
        next.splice(idx + 1, 0, newBlock);
      }
      queueMicrotask(() => setActiveBlockId(newBlock.id));
      return next;
    });
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Top bar */}
      <div
        className={cn(
          "titlebar relative flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3",
          // macOS traffic-lights live inside the webview when titleBarStyle is hiddenInset.
          // Add a safe inset so our controls never overlap them.
          isMac && "pt-8 pl-[88px]"
        )}
      >
        <div className="flex items-center gap-2">
          <GlassIconButton
            icon={<LayoutGrid className="h-4 w-4" />}
            label={sidebarOpen ? t("editor.closeDocs") : t("editor.openDocs")}
            onClick={onToggleSidebar}
          />
          <div className="hidden sm:block h-6 w-px bg-white/10" />
        </div>

        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => onRename(title)}
            placeholder={t("editor.titlePlaceholder")}
            className={cn(
              "no-drag w-full bg-transparent text-base font-medium outline-none placeholder:text-white/35",
              "text-white/90"
            )}
          />
          <div className="mt-0.5 text-[11px] text-white/45">
            {t("editor.stats", { words: docStats.words, chars: docStats.chars })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <GlassIconButton
            icon={<Plus className="h-4 w-4" />}
            label={t("editor.newDoc")}
            onClick={onCreateDoc}
          />
          <GlassIconButton
            icon={<Download className="h-4 w-4" />}
            label={t("editor.export")}
            onClick={onExport}
          />
          <GlassIconButton
            icon={<Upload className="h-4 w-4" />}
            label={t("editor.import")}
            onClick={async () => {
              if (window.electronAPI?.openMarkdown) {
                const res = await window.electronAPI.openMarkdown();
                if (res?.content != null) onImport(res.content, res.filePath);
              } else {
                inputFileRef.current?.click();
              }
            }}
          />

          {/* Language switch */}
          <LangSwitch
            lang={lang}
            onChange={setLang}
            ariaLabel={t("language.switch")}
          />
          <input
            ref={inputFileRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            // Don't use display:none here: some Chromium/Electron builds can
            // block programmatic clicks on fully hidden file inputs.
            // `sr-only` keeps it accessible without affecting layout.
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => {
                const t = String(reader.result ?? "");
                onImport(t, f.name);
              };
              reader.readAsText(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1">
        <div
          ref={scrollRef}
          className={cn(
            "h-full overflow-auto px-4 py-6 sm:px-8",
            "scroll-smooth"
          )}
        >
          <div className="mx-auto w-full max-w-[860px]">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-xs text-white/45">
                {t("editor.hintClick")} ·{" "}
                <span className="text-white/70">Esc</span> {t("editor.hintExit")} ·{" "}
                <span className="text-white/70">Cmd/Ctrl+Enter</span> {t("editor.hintSplit")} ·{" "}
                <span className="text-white/70">Backspace</span> {t("editor.hintDeleteEmpty")}
              </div>
              <button
                onClick={() => addEmptyBlock(blocks[blocks.length - 1]?.id)}
                className="no-drag rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {t("editor.addBlock")}
              </button>
            </div>

            <div className="space-y-3">
              {blocks.map((b) => (
                <MarkdownBlock
                  key={b.id}
                  id={b.id}
                  text={b.text}
                  active={activeBlockId === b.id}
                  onActivate={() => setActiveBlockId(b.id)}
                  onDeactivate={() => setActiveBlockId(null)}
                  onChange={(t) => updateBlock(b.id, t)}
                  onSplit={(cursor) => splitBlockAtCursor(b.id, cursor)}
                  onMergePrev={() => mergeWithPrevious(b.id)}
                  onDelete={() => deleteBlock(b.id)}
                />
              ))}
            </div>

            
{/* Footer hint */}
				<div className="mt-10 text-center text-xs text-white/35">
				  <div>
				    (t)ext · {t("editor.footerBy")}{" "}
                    <a
                      href="https://www.matteocaputo.dev/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                    >
                      Matteo Caputo
                    </a>{" "}
                    <span className="text-white/25">·</span>{" "}
                    <a
                      href="https://davialessio.dev/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                    >
                      Alessio Daví
                    </a>
				  </div>
  <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
    <button
      type="button"
      onClick={() => setPolicyOpen(true)}
      data-legal="policy-link"
      className="no-drag inline-flex items-center gap-1.5 text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white"
    >
      <Cookie className="h-3.5 w-3.5" />
      {t("editor.policyLink")}
    </button>
  </div>
</div>
</div>
        </div>

        
{/* Subtle bottom glow */}
<div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

<CookieBanner onOpenPolicy={() => setPolicyOpen(true)} />

<AnimatePresence>
  {policyOpen && (
    <PolicyModal key="policy" onClose={() => setPolicyOpen(false)} />
  )}
</AnimatePresence>
      </div>
    </div>
  );
}

function GlassIconButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "no-drag",
        "group relative inline-flex items-center justify-center rounded-2xl border border-white/10",
        "bg-white/5 px-3 py-2 text-white/80 shadow-glass backdrop-blur-xl transition",
        "hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      )}
      aria-label={label}
      title={label}
    >
      <span className="grid place-items-center">{icon}</span>
      <span className="ml-2 hidden text-xs font-medium sm:inline">{label}</span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 bg-gradient-to-b from-white/10 to-transparent" />
    </button>
  );
}

function LangSwitch({
  lang,
  onChange,
  ariaLabel
}: {
  lang: "it" | "en";
  onChange: (l: "it" | "en") => void;
  ariaLabel: string;
}) {
  const base =
    "no-drag inline-flex items-center rounded-2xl border border-white/10 bg-white/5 p-1 shadow-glass backdrop-blur-xl";
  const btn =
    "rounded-xl px-2.5 py-1.5 text-[11px] font-semibold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20";
  const active = "bg-white/12 text-white";
  const inactive = "text-white/60 hover:bg-white/8 hover:text-white/85";

  return (
    <div className={base} aria-label={ariaLabel} role="group">
      <button
        type="button"
        className={cn(btn, lang === "it" ? active : inactive)}
        onClick={() => onChange("it")}
      >
        IT
      </button>
      <button
        type="button"
        className={cn(btn, lang === "en" ? active : inactive)}
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}
