import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { highlightMarkdown } from "../lib/mdHighlight";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";

type Props = {
  text: string;
  onChange: (next: string) => void;
};

export default function MarkdownBlock({ text, onChange }: Props) {
  const { t } = useI18n();
  const [local, setLocal] = useState(text);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep local state in sync when text changes externally (e.g. import)
  useEffect(() => {
    setLocal(text);
  }, [text]);

  const setTextareaRef = useCallback((node: HTMLTextAreaElement | null) => {
    taRef.current = node;
    if (!node) return;
    requestAnimationFrame(() => {
      autosize(node);
      requestAnimationFrame(() => autosize(node));
    });
  }, []);

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    const min = 28;
    const next = Math.max(el.scrollHeight || 0, min);
    el.style.height = `${next}px`;
  }

  const highlighted = useMemo(() => highlightMarkdown(local), [local]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-xl"
      )}
    >
      <div className="relative px-4 py-3">
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
            onFocus={(e) => {
              // On mobile, scroll the textarea into view when the virtual keyboard opens.
              requestAnimationFrame(() => {
                e.target.scrollIntoView({ behavior: "smooth", block: "nearest" });
              });
            }}
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
      </div>
    </div>
  );
}
