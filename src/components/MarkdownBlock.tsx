import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { highlightMarkdown } from "../lib/mdHighlight";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";
import { useIsCoarsePointer } from "../hooks/useIsCoarsePointer";

type Props = {
  text: string;
  render: (markdown: string) => string;
  onChange: (next: string) => void;
};

export default function MarkdownBlock({ text, render, onChange }: Props) {
  const { t } = useI18n();
  const isCoarsePointer = useIsCoarsePointer();
  const [local, setLocal] = useState(text);
  const [isEditing, setIsEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Keep local state in sync when text changes externally (e.g. import)
  useEffect(() => {
    setLocal(text);
  }, [text]);

  useEffect(() => {
    if (!isEditing) return;
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      const target = e.target as Node | null;
      if (!root || !target) return;
      if (!root.contains(target)) {
        setIsEditing(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isEditing]);

  const setTextareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    taRef.current = node;
    if (!node) return;
    requestAnimationFrame(() => {
      autosize(node);
      requestAnimationFrame(() => autosize(node));
    });
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const el = taRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      const pos = el.value.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        // ignore
      }
      autosize(el);
    });
  }, [isEditing]);

  async function copyText(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
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

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    const min = 28;
    const next = Math.max(el.scrollHeight || 0, min);
    el.style.height = `${next}px`;
  }

  const highlighted = useMemo(() => (isEditing ? highlightMarkdown(local) : ""), [isEditing, local]);
  const isEmpty = useMemo(() => local.trim() === "", [local]);
  const html = useMemo(() => {
    if (isEditing) return "";
    if (isEmpty) return "";
    return render(local || " ");
  }, [isEditing, isEmpty, local, render]);

  useEffect(() => {
    if (isEditing) return;
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
        }, 1000);
      };

      btn.addEventListener("mousedown", onMouseDown);
      btn.addEventListener("click", onClick);
      wrap.appendChild(btn);
    });
  }, [html, isEditing, t]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-glass transition",
        isCoarsePointer ? "backdrop-blur-md" : "backdrop-blur-xl",
        isEditing ? "ring-1 ring-white/15 bg-white/10" : "hover:bg-white/7"
      )}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-no-activate]")) return;
        if (!isEditing) setIsEditing(true);
      }}
    >
      <div className="relative px-4 py-3">
        <AnimatePresence initial={false} mode="sync">
          {isEditing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: isCoarsePointer ? 0.1 : 0.16 }}
              className="relative"
              data-no-activate
            >
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
                    "overflow-hidden whitespace-pre-wrap break-words",
                    "text-[15px] leading-relaxed font-mono text-white/85"
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
                  onFocus={(e) => {
                    // On mobile, keep the input visible while the virtual keyboard opens.
                    requestAnimationFrame(() => {
                      e.target.scrollIntoView({
                        behavior: isCoarsePointer ? "auto" : "smooth",
                        block: "nearest"
                      });
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setIsEditing(false);
                      return;
                    }

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
                      }
                    }
                  }}
                  placeholder={t("block.placeholder")}
                  className={cn(
                    "relative z-10 w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none",
                    "overflow-hidden",
                    "text-transparent caret-white/90",
                    "placeholder:text-white/35",
                    "font-mono",
                    "selection:bg-white/20 selection:text-transparent"
                  )}
                  style={{ minHeight: "28px" }}
                />
              </div>
              <div className="mt-2 text-right text-[11px] text-white/45">
                {t("block.editing")} · Esc
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              ref={previewRef}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: isCoarsePointer ? 0.12 : 0.2 }}
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
