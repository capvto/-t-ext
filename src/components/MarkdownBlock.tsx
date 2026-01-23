import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { renderMarkdown } from "../lib/markdown";
import { cn } from "../lib/utils";

type Props = {
  id: string;
  text: string;
  active: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onChange: (next: string) => void;
  onSplit: (cursor: number) => void;
  onMergePrev: () => void;
  onDelete: () => void;
};

export default function MarkdownBlock({
  text,
  active,
  onActivate,
  onDeactivate,
  onChange,
  onSplit,
  onMergePrev,
  onDelete
}: Props) {
  const [local, setLocal] = useState(text);
  const [typing, setTyping] = useState(false);
  const tRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // When switching blocks, keep local state aligned
    if (!active) setLocal(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  useEffect(() => {
    if (active) {
      // Focus when activated
      queueMicrotask(() => {
        taRef.current?.focus();
        // place caret at end
        const el = taRef.current;
        if (el) {
          const n = el.value.length;
          el.setSelectionRange(n, n);
        }
      });
    }
  }, [active]);

  const html = useMemo(() => renderMarkdown(text || " "), [text]);

  function scheduleIdle() {
    if (tRef.current) window.clearTimeout(tRef.current);
    setTyping(true);
    tRef.current = window.setTimeout(() => setTyping(false), 650);
  }

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl transition",
        "hover:bg-white/7",
        active && "bg-white/10 ring-1 ring-white/15"
      )}
      onMouseDown={(e) => {
        // Allow selecting text in preview without instantly activating.
        // Activate on click (not drag). This keeps the flow smooth.
        if ((e.target as HTMLElement).closest("[data-no-activate]")) return;
      }}
      onClick={() => onActivate()}
    >
      <div className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 transition group-hover:opacity-100 bg-gradient-to-b from-white/10 to-transparent" />

      {/* Delete button */}
      <button
        type="button"
        data-no-activate
        aria-label="Elimina blocco"
        title="Elimina blocco"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className={cn(
          "no-drag absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-xl",
          "border border-white/10 bg-black/30 px-2 py-2 text-white/70 backdrop-blur",
          "opacity-0 transition hover:bg-black/50 hover:text-white",
          (active ? "opacity-100" : "group-hover:opacity-100")
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="relative px-4 py-3">
        <AnimatePresence initial={false} mode="wait">
          {/* Edit mode (shows raw markdown) */}
          {active && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.18 }}
              className="relative"
              data-no-activate
            >
              {/* Behind-the-scenes preview glow while typing */}
              <div className="pointer-events-none absolute inset-0 -m-2 rounded-3xl opacity-0 blur-2xl transition group-hover:opacity-100 bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-cyan-400/10" />

              <textarea
                ref={taRef}
                value={local}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocal(v);
                  onChange(v);
                  scheduleIdle();
                  autosize(e.target);
                }}
                onInput={(e) => autosize(e.currentTarget)}
                onKeyDown={(e) => {
                  // Inline formatting shortcuts (Typora-like)
                  // Cmd/Ctrl + B => **bold**
                  // Cmd/Ctrl + I => *italic*
                  // Cmd/Ctrl + U => <u>underline</u>
                  if (e.metaKey || e.ctrlKey) {
                    const k = (e.key || "").toLowerCase();
                    if (k === "b" || k === "i" || k === "u") {
                      e.preventDefault();
                      const el = e.currentTarget;
                      const start = el.selectionStart ?? 0;
                      const end = el.selectionEnd ?? start;
                      const hasSelection = end > start;

                      const open = k === "b" ? "**" : k === "i" ? "*" : "<u>";
                      const close = k === "b" ? "**" : k === "i" ? "*" : "</u>";

                      if (hasSelection) {
                        const selected = el.value.slice(start, end);
                        el.setRangeText(open + selected + close, start, end, "end");
                        // Keep selection on the original text (without the wrapper)
                        const selStart = start + open.length;
                        const selEnd = selStart + selected.length;
                        el.setSelectionRange(selStart, selEnd);
                      } else {
                        el.setRangeText(open + close, start, end, "end");
                        const pos = start + open.length;
                        el.setSelectionRange(pos, pos);
                      }

                      const v = el.value;
                      setLocal(v);
                      onChange(v);
                      scheduleIdle();
                      autosize(el);
                      return;
                    }
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onDeactivate();
                    return;
                  }
                  // Split block at cursor
                  if ((e.key === "Enter") && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    const cursor = e.currentTarget.selectionStart ?? local.length;
                    onSplit(cursor);
                    return;
                  }
                  // Merge with previous when backspacing at start
                  if (e.key === "Backspace") {
                    const cursor = e.currentTarget.selectionStart ?? 0;
                    const selection = (e.currentTarget.selectionEnd ?? 0) - cursor;
                    if (cursor === 0 && selection === 0) {
                      e.preventDefault();
                      // Notion-like: if the block is empty, remove it.
                      if (local.trim() === "") {
                        onDelete();
                        return;
                      }
                      onMergePrev();
                    }
                  }
                }}
                placeholder="Scrivi…"
                className={cn(
                  "w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none",
                  "text-white/90 placeholder:text-white/35",
                  "font-sans"
                )}
                style={{ minHeight: "28px" }}
              />

              {/* Typora-like hint: when user stops typing, fade to preview */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/40">
                <span>
                  {typing ? "Editing…" : "Preview ready"}
                </span>
                <span className="text-white/55">
                  Esc · Cmd/Ctrl+Enter
                </span>
              </div>

              <AnimatePresence>
                {!typing && local.trim() !== "" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div
                      className="prose prose-invert max-w-none text-white/85"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(local) }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Preview mode (clean render, no symbols) */}
          {!active && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.22 }}
              className="prose prose-invert max-w-none text-white/85"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
