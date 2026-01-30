import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import type { MarkdownRenderer } from "../lib/markdown";
import { highlightMarkdown } from "../lib/mdHighlight";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";

type Props = {
  id: string;
  text: string;
  render: MarkdownRenderer["render"];
  active: boolean;
  /** Enables block splitting via Cmd/Ctrl+Enter. */
  allowSplit?: boolean;
  /** Enables deleting blocks (button + delete-empty shortcut). */
  allowDelete?: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onChange: (next: string) => void;
  onSplit: (cursor: number) => void;
  onMergePrev: () => void;
  onDelete: () => void;
};

export default function MarkdownBlock({
  text,
  render,
  active,
  allowSplit = true,
  allowDelete = true,
  onActivate,
  onDeactivate,
  onChange,
  onSplit,
  onMergePrev,
  onDelete
}: Props) {
  const { t } = useI18n();
  const [local, setLocal] = useState(text);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  function focusAndAutosize(el: HTMLTextAreaElement) {
    // Focus + autosize when activated.
    // Use rAF (and a second rAF) to ensure layout is stable (Framer Motion
    // enter animation + scrollbar changes can otherwise cause a wrong
    // scrollHeight and make the highlighted <pre> "bleed" outside the card).
    requestAnimationFrame(() => {
      el.focus();
      const n = el.value.length;
      try {
        el.setSelectionRange(n, n);
      } catch {
        // ignored
      }
      autosize(el);
      requestAnimationFrame(() => autosize(el));
    });
  }

  // Callback ref: AnimatePresence (mode="wait") mounts the textarea only *after*
  // the preview has finished its exit animation. In that case, an effect that
  // runs on `active` would see `taRef.current === null` and never re-run.
  // Using a callback ref guarantees we autosize as soon as the element exists.
  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      taRef.current = node;
      if (!node) return;
      if (active) focusAndAutosize(node);
    },
    // Only depends on `active` (local text changes are handled by onChange/onInput).
    [active]
  );

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for environments where Clipboard API is unavailable
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  useEffect(() => {
    // When switching blocks, keep local state aligned
    if (!active) setLocal(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  useEffect(() => {
    if (!active) return;

    // In rare cases (depending on timing of animations), the ref may not be
    // available the instant `active` flips to true. Retry a few frames.
    let tries = 0;
    let raf = 0;
    const tick = () => {
      const el = taRef.current;
      if (el) {
        focusAndAutosize(el);
        return;
      }
      tries += 1;
      if (tries > 12) return; // ~200ms at 60fps
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const isEmpty = useMemo(() => (text ?? "").trim() === "", [text]);
  const html = useMemo(() => {
    if (active) return "";
    // When empty and not focused, render nothing and show our own placeholder
    // so it remains visible even when the block isn't selected.
    if (isEmpty) return "";
    return render(text || " ");
  }, [text, active, render, isEmpty]);
  const highlighted = useMemo(() => (active ? highlightMarkdown(local) : ""), [active, local]);

  // Enhance rendered preview code blocks:
  // - add a copy button
  // (syntax highlighting is handled in src/lib/markdown.ts using highlight.js)
  useEffect(() => {
    if (active) return;
    const root = previewRef.current;
    if (!root) return;

    const wraps = Array.from(root.querySelectorAll<HTMLElement>("[data-codewrap]"));
    wraps.forEach((wrap) => {
      if (wrap.querySelector("[data-copy-btn]")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("data-copy-btn", "true");
      btn.setAttribute("data-no-activate", "true");
      btn.setAttribute("aria-label", t("code.copy"));
      btn.setAttribute("title", t("code.copy"));
      btn.textContent = t("code.copy");

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      const onClick = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const code = wrap.querySelector("code");
        const raw = (code?.textContent ?? "");
        if (!raw.trim()) return;

        const ok = await copyText(raw);
        if (!ok) return;

        const prev = btn.textContent || "";
        btn.textContent = t("code.copied");
        window.setTimeout(() => {
          btn.textContent = prev;
        }, 1100);
      };

      btn.addEventListener("mousedown", onMouseDown);
      btn.addEventListener("click", onClick);

      wrap.appendChild(btn);
    });
  }, [active, html, t]);

  function autosize(el: HTMLTextAreaElement) {
    // "auto" avoids rare measurement glitches compared to forcing 0px.
    el.style.height = "auto";
    const min = 28;
    const next = Math.max(el.scrollHeight || 0, min);
    el.style.height = `${next}px`;
  }

  return (
    <div
      className={cn(
        // Ensure an empty block still has enough height for the action button.
        // In preview mode, an empty markdown render can result in 0 content height.
        "group relative min-h-[56px] overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl transition",
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
      {/* Delete button (preview only). In edit mode we keep the UI clean. */}
      {allowDelete && !active ? (
        <button
          type="button"
          data-no-activate
          aria-label={t("block.delete")}
          title={t("block.delete")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "no-drag absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-xl",
            "border border-white/10 bg-black/30 px-2 py-2 text-white/70 backdrop-blur",
            "opacity-0 transition hover:bg-black/50 hover:text-white",
            "group-hover:opacity-100"
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}

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

              {/*
                Editor highlighting technique:
                - A <pre> renders highlighted HTML behind
                - The textarea is transparent (caret + selection stay visible)
              */}
              <div className="relative">
                <pre
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 m-0 w-full p-0",
                    "overflow-hidden",
                    "whitespace-pre-wrap break-words",
                    "text-[15px] leading-relaxed",
                    "font-mono text-white/85"
                  )}
                >
                  <code dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>

                <textarea
                  ref={setTextareaRef}
                  value={local}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocal(v);
                    onChange(v);

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
                  if (allowSplit && (e.key === "Enter") && (e.metaKey || e.ctrlKey)) {
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
                      if (allowDelete && local.trim() === "") {
                        onDelete();
                        return;
                      }
                      onMergePrev();
                    }
                  }
                }}
                  placeholder={t("block.placeholder")}
                  className={cn(
                    "relative z-10 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none",
                    // The block grows to fit content (autosize), so we never want a nested
                    // textarea scrollbar (it also desyncs the overlay highlighter).
                    "overflow-hidden",
                    // Transparent text: visible content comes from the highlighted <pre>
                    "text-transparent caret-white/90",
                    "placeholder:text-white/35",
                    "font-mono",
                    // Selection still readable as a highlight overlay
                    "selection:bg-white/20 selection:text-transparent"
                  )}
                  style={{ minHeight: "28px" }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/40">
                <span>{t("block.editing")}</span>
                <span className="text-white/55">
                  Esc · Cmd/Ctrl+Enter
                </span>
              </div>
            </motion.div>
          )}

          {/* Preview mode (clean render, no symbols) */}
          {!active && (
            <motion.div
              key="preview"
              ref={previewRef}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.22 }}
              className="prose prose-invert max-w-none text-white/85 prose-code:before:content-none prose-code:after:content-none"
              {...(isEmpty ? {} : { dangerouslySetInnerHTML: { __html: html } })}
            >
              {isEmpty ? (
                <div className="not-prose select-none font-mono text-[15px] leading-relaxed text-white/35">
                  {t("block.placeholder")}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
