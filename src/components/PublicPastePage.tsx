import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, Download, Save, Trash2 } from "lucide-react";
import { createMarkdownRenderer } from "../lib/markdown";
import { cn } from "../lib/utils";
import { deletePaste, getPaste, safeErrorText, updatePaste } from "../lib/rentryApi";
import { useI18n } from "../i18n";

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

export default function PublicPastePage({
  id,
  onGoHome,
  onSaveToText
}: {
  id: string;
  onGoHome?: () => void;
  onSaveToText?: (payload: { title: string; content: string; sourceUrl: string }) => void;
}) {
  const { t } = useI18n();

  const sourceUrl = useMemo(() => {
    try {
      return (window.location.origin || "") + window.location.pathname;
    } catch {
      try {
        return String(window.location.href || "").split("?")[0] || "";
      } catch {
        return "";
      }
    }
  }, [id]);

  const editCode = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("edit")?.trim() || "";
    } catch {
      return "";
    }
  }, []);

  const renderer = useMemo(() => createMarkdownRenderer([]), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    void (async () => {
      try {
        const r = await getPaste(id);
        if (!alive) return;
        setTitle(r.title || "");
        setContent(r.content || "");
        setUpdatedAt(r.updatedAt || "");
      } catch (e: any) {
        if (!alive) return;
        setErr(safeErrorText(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const html = useMemo(() => renderer.render(content), [renderer, content]);

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="titlebar relative flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => {
            if (onGoHome) onGoHome();
            else window.location.href = "/";
          }}
          className={cn(
            "no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 shadow-glass backdrop-blur-xl transition",
            "hover:bg-white/10 hover:text-white"
          )}
          aria-label={t("public.back")}
          title={t("public.back")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("public.back")}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white/90">
            {title?.trim() ? title : t("public.untitled")}
          </div>
          <div className="mt-0.5 text-[11px] text-white/45">
            {updatedAt ? t("public.updatedAt", { date: new Date(updatedAt).toLocaleString() }) : " "}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSaveToText ? (
            <button
              type="button"
              disabled={loading || !!err}
              onClick={() => {
                onSaveToText({
                  title: title?.trim() ? title : t("public.untitled"),
                  content: content || "",
                  sourceUrl
                });
              }}
              className={cn(
                "no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm",
                loading || !!err
                  ? "bg-white/5 text-white/40"
                  : "bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
              )}
              aria-label={t("public.saveToText")}
              title={t("public.saveToText")}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("public.saveToText")}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(window.location.href);
              if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }
            }}
            className="no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">{copied ? t("publish.copied") : t("public.copyLink")}</span>
          </button>

          {editCode ? (
            <>
              <button
                type="button"
                disabled={saving || loading}
                onClick={async () => {
                  setSaving(true);
                  setErr("");
                  try {
                    const r = await updatePaste(id, editCode, content);
                    setUpdatedAt(r.updatedAt || new Date().toISOString());
                  } catch (e: any) {
                    setErr(safeErrorText(e));
                  } finally {
                    setSaving(false);
                  }
                }}
                className={cn(
                  "no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm",
                  saving || loading
                    ? "bg-white/5 text-white/40"
                    : "bg-white/10 text-white/85 transition hover:bg-white/15 hover:text-white"
                )}
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saving ? t("public.saving") : t("public.save")}</span>
              </button>

              <button
                type="button"
                disabled={deleting || loading}
                onClick={async () => {
                  if (!confirm(t("public.confirmDelete"))) return;
                  setDeleting(true);
                  setErr("");
                  try {
                    await deletePaste(id, editCode);
                    if (onGoHome) onGoHome();
                    else window.location.href = "/";
                  } catch (e: any) {
                    setErr(safeErrorText(e));
                  } finally {
                    setDeleting(false);
                  }
                }}
                className={cn(
                  "no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm",
                  deleting || loading
                    ? "bg-white/5 text-white/40"
                    : "bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                )}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("public.delete")}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-[860px]">
            {loading ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
                {t("public.loading")}
              </div>
            ) : err ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
                {t("public.error")}: {err}
              </div>
            ) : (
              <>
                {editCode ? (
                  <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/55">{t("public.editMode")}</div>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className={cn(
                        "mt-3 w-full min-h-[260px] resize-y rounded-2xl border border-white/10 bg-zinc-950/60 p-4",
                        "font-mono text-[13px] leading-relaxed text-white/85 outline-none",
                        "focus:border-white/20 focus:ring-2 focus:ring-white/10"
                      )}
                    />
                  </div>
                ) : null}

                <div
                  className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </>
            )}

            <AnimatePresence>
              {!loading && !err && (
                <motion.div
                  className="mt-10 text-center text-[11px] text-white/35"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                >
                  {t("public.footer")}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
    </div>
  );
}
