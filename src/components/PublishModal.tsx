import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Copy, ExternalLink, Share2, X } from "lucide-react";
import { useI18n } from "../i18n";
import { publishPaste, safeErrorText } from "../lib/rentryApi";

type Props = {
  title: string;
  content: string;
  onClose: () => void;
};

function useOrigin() {
  return useMemo(() => {
    try {
      return window.location.origin || "";
    } catch {
      return "";
    }
  }, []);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

const RESERVED_SLUGS = new Set(["p", "assets", "api", "favicon.ico", "robots.txt", "sitemap.xml", "index.html"]);

function normalizeSlugInput(raw: string) {
  let s = String(raw || "");
  s = s.toLowerCase();
  s = s.replace(/\s+/g, "-");
  // Strip everything except: a-z, 0-9, -, _
  s = s.replace(/[^a-z0-9-_]/g, "");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^[-_]+|[-_]+$/g, "");
  if (s.length > 64) s = s.slice(0, 64).replace(/^[-_]+|[-_]+$/g, "");
  return s;
}

function isValidSlug(slug: string) {
  if (!slug) return true;
  if (slug.length < 2 || slug.length > 64) return false;
  if (!/^[a-z0-9][a-z0-9-_]*[a-z0-9]$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

export default function PublishModal({ title, content, onClose }: Props) {
  const { t, lang } = useI18n();
  const origin = useOrigin();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{ viewUrl: string; editCode: string } | null>(null);
  const [copied, setCopied] = useState<string>("");
  const [slug, setSlug] = useState<string>("");

  const isIt = lang === "it";

  const resolvedTitle = (title || "").trim() || t("doc.untitled");

  const exampleOrigin = origin || "https://web.textmarkdown.app";
  const slugOk = useMemo(() => isValidSlug(slug), [slug]);

  const viewUrl = result?.viewUrl?.startsWith("/") && origin ? origin + result.viewUrl : result?.viewUrl || "";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label={isIt ? "Chiudi" : "Close"}
        className="absolute inset-0 z-0 cursor-default bg-black/70"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        className={
          "relative z-10 w-full max-w-[640px] overflow-hidden rounded-3xl " +
          "border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl " +
          "flex flex-col"
        }
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-base font-semibold text-white/90">
              <Share2 className="h-4 w-4" />
              {t("publish.title")}
            </div>
            <div className="mt-0.5 text-xs text-white/45">
              {t("publish.subtitle", { title: resolvedTitle })}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={isIt ? "Chiudi finestra" : "Close dialog"}
            title={isIt ? "Chiudi" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {!result ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium text-white/85">{t("publish.what")}</div>
                <div className="mt-1 text-xs leading-relaxed text-white/55">
                  {t("publish.desc")}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium text-white/85">{t("publish.customLink")}</div>
                <div className="mt-1 text-xs leading-relaxed text-white/55">
                  {t("publish.customLinkDesc", { origin: exampleOrigin })}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="shrink-0 select-none rounded-2xl border border-white/10 bg-zinc-950/40 px-3 py-2 font-mono text-xs text-white/55">
                    {exampleOrigin.replace(/\/$/, "")}/
                  </div>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(normalizeSlugInput(e.target.value))}
                    placeholder={lang === "it" ? "mia-pagina" : "my-page"}
                    inputMode="url"
                    className={
                      "no-drag w-full flex-1 rounded-2xl border bg-zinc-950/60 px-3 py-2 font-mono text-xs text-white/85 outline-none " +
                      (slug && !slugOk
                        ? "border-red-500/40 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
                        : "border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10")
                    }
                    aria-label={t("publish.customLink")}
                  />
                </div>

                <div className={"mt-2 text-[11px] " + (slug && !slugOk ? "text-red-200" : "text-white/35")}>
                  {slug && !slugOk ? t("publish.customLinkInvalid") : t("publish.customLinkHint")}
                </div>
              </div>

              {error ? (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !content.trim() || (!!slug && !slugOk)}
                  onClick={async () => {
                    if (slug && !slugOk) {
                      setError(t("publish.customLinkInvalid"));
                      return;
                    }
                    setError("");
                    setBusy(true);
                    try {
                      const r = await publishPaste(resolvedTitle, content, slug || undefined);
                      setResult({ viewUrl: r.viewUrl, editCode: r.editCode });
                    } catch (e: any) {
                      setError(safeErrorText(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className={
                    "no-drag inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-2 text-sm " +
                    (busy || !content.trim()
                      ? "bg-white/5 text-white/40"
                      : "bg-white/10 text-white/85 transition hover:bg-white/15 hover:text-white")
                  }
                >
                  {busy ? t("publish.publishing") : t("publish.publish")}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="no-drag inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {t("publish.close")}
                </button>
              </div>

              <div className="mt-3 text-[11px] text-white/35">
                {t("publish.note")}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Field
                  label={t("publish.viewLink")}
                  value={viewUrl}
                  copied={copied === "view"}
                  onCopy={async () => {
                    const ok = await copyToClipboard(viewUrl);
                    if (ok) {
                      setCopied("view");
                      setTimeout(() => setCopied(""), 1200);
                    }
                  }}
                />
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                    {t("publish.editCode")}
                  </div>
                  <div className="mt-1 font-mono text-sm text-white/80 select-all">
                    {result.editCode}
                  </div>
                  <div className="mt-1 text-[11px] text-white/45">
                    {t("publish.editCodeHint")}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="no-drag inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/85 transition hover:bg-white/15 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("publish.open")}
                  </a>

                  <button
                    type="button"
                    onClick={onClose}
                    className="no-drag inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    {t("publish.done")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function Field({
  label,
  value,
  onCopy,
  copied
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="min-w-0 flex-1 select-all truncate font-mono text-xs text-white/75">
          {value}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="no-drag inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
          aria-label={t("publish.copy")}
          title={t("publish.copy")}
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? t("publish.copied") : t("publish.copy")}
        </button>
      </div>
    </div>
  );
}
