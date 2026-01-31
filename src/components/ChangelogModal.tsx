import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "../i18n";
import { createMarkdownRenderer } from "../lib/markdown";
import changelogMd from "../../CHANGELOG.md?raw";

type Props = {
  onClose: () => void;
};

export default function ChangelogModal({ onClose }: Props) {
  const { t, lang } = useI18n();
  const previewRef = useRef<HTMLDivElement | null>(null);

  const renderer = useMemo(() => createMarkdownRenderer([]), []);
  const html = useMemo(() => renderer.render(changelogMd), [renderer]);

  // Add copy buttons to code blocks (same UX as note preview)
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return;

    const wraps = Array.from(root.querySelectorAll<HTMLElement>("[data-codewrap]"));
    wraps.forEach((wrap) => {
      if (wrap.querySelector("[data-copy-btn]")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("data-copy-btn", "true");
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
        const raw = code?.textContent ?? "";
        if (!raw.trim()) return;

        try {
          await navigator.clipboard.writeText(raw);
          const prev = btn.textContent;
          btn.textContent = t("code.copied");
          setTimeout(() => (btn.textContent = prev), 900);
        } catch {
          // ignore
        }
      };

      btn.addEventListener("mousedown", onMouseDown);
      btn.addEventListener("click", onClick);

      wrap.appendChild(btn);
    });
  }, [html, t]);

  const isIt = lang === "it";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={isIt ? "Chiudi" : "Close"}
        className="absolute inset-0 z-0 cursor-default bg-black/70"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={isIt ? "Changelog" : "Changelog"}
        className={
          "relative z-10 w-full max-w-[860px] max-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl " +
          "border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl flex flex-col"
        }
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white/90">
              {isIt ? "Changelog" : "Changelog"}
            </div>
            <div className="mt-0.5 text-xs text-white/50">
              {isIt ? "Cronologia delle modifiche" : "Release notes"}
            </div>
          </div>

          <button
            type="button"
            aria-label={isIt ? "Chiudi" : "Close"}
            onClick={onClose}
            className="no-drag inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div
            ref={previewRef}
            className="prose prose-invert max-w-none text-white/85 prose-code:before:content-none prose-code:after:content-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
