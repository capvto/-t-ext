import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, Download, Pencil } from "lucide-react";
import { createMarkdownRenderer } from "../lib/markdown";
import { cn } from "../lib/utils";
import { getPaste, safeErrorText } from "../lib/rentryApi";
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

const EDIT_CODE_RE = /^[0-9a-zA-Z]{12}$/;

function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function stripEditSecretFromUrl() {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("edit")) return;
    u.searchParams.delete("edit");
    // legacy params (avoid keeping confusing state)
    if (u.searchParams.has("mode")) u.searchParams.delete("mode");
    const qs = u.searchParams.toString();
    const next = u.pathname + (qs ? `?${qs}` : "") + u.hash;
    window.history.replaceState({}, "", next);
  } catch {
    // ignore
  }
}

export default function PublicPastePage({
  id,
  onGoHome,
  onGoEdit,
  onSaveToText
}: {
  id: string;
  onGoHome?: () => void;
  onGoEdit?: (id: string) => void;
  onSaveToText?: (payload: { title: string; content: string; sourceUrl: string }) => void;
}) {
  const { t } = useI18n();

  const DEV = import.meta.env.DEV;
  const devLog = (...args: any[]) => {
    if (!DEV) return;
    // eslint-disable-next-line no-console
    console.debug("[t-ext/public-view]", ...args);
  };

  const origin = useMemo(() => {
    try {
      return window.location.origin || "";
    } catch {
      return "";
    }
  }, []);

  const sourceUrl = useMemo(() => {
    try {
      // Preserve the current public route (/id or /p/id). Strip query to avoid leaking secrets.
      const u = new URL(window.location.href);
      return (origin ? origin : "") + u.pathname;
    } catch {
      try {
        return String(window.location.href || "").split("?")[0] || "";
      } catch {
        return "";
      }
    }
  }, [origin, id]);

  // If someone lands on a legacy "view" URL with ?edit=SECRET, we do NOT unlock editing
  // here anymore. We migrate the secret into sessionStorage and redirect to the dedicated
  // edit page (/edit/:id) so the project has a single, consistent editing UI.
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search || "");
      const fromQuery = (qs.get("edit") || "").trim();
      if (EDIT_CODE_RE.test(fromQuery)) {
        devLog("migrate secret from query -> /edit route");
        safeSessionSet(`t-ext:editCode:${id}`, fromQuery);
        stripEditSecretFromUrl();
        if (onGoEdit) onGoEdit(id);
        else window.location.href = `/edit/${encodeURIComponent(id)}`;
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const renderer = useMemo(() => createMarkdownRenderer([]), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErr("");
      try {
        const r = await getPaste(id);
        if (cancelled) return;
        setTitle(r.title || "");
        setContent(r.content || "");
        setUpdatedAt(r.updatedAt || "");
      } catch (e: any) {
        if (cancelled) return;
        setErr(safeErrorText(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const html = useMemo(() => renderer.render(content), [renderer, content]);

  const goHome = () => {
    if (onGoHome) onGoHome();
    else window.location.href = "/";
  };

  const goEdit = (e?: MouseEvent<HTMLAnchorElement>) => {
    if (e) e.preventDefault();
    if (onGoEdit) onGoEdit(id);
    else window.location.href = `/edit/${encodeURIComponent(id)}`;
  };

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="relative z-30 border-b border-white/10 bg-[var(--app-titlebar)] backdrop-blur-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ui="topbar-btn"
            onClick={goHome}
            className="no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            aria-label={t("public.back")}
            title={t("public.back")}
          >
            <ArrowLeft className="h-4 w-4 pointer-events-none" />
            <span className="hidden sm:inline">{t("public.back")}</span>
          </button>

          <div className="min-w-0 flex-1 pointer-events-none">
            <div className="truncate text-sm font-semibold text-white/90">
              {title?.trim() ? title : t("public.untitled")}
            </div>
            <div className="mt-0.5 text-[11px] text-white/45">
              {updatedAt ? t("public.updatedAt", { date: new Date(updatedAt).toLocaleString() }) : " "}
            </div>
          </div>

          <div className="flex flex-none items-center gap-2">
            {onSaveToText ? (
              <button
                type="button"
                data-ui="topbar-btn"
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
                <Download className="h-4 w-4 pointer-events-none" />
                <span className="hidden sm:inline">{t("public.saveToText")}</span>
              </button>
            ) : null}

            <button
              type="button"
              data-ui="topbar-btn"
              onClick={async () => {
                const ok = await copyToClipboard(sourceUrl);
                if (ok) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }
              }}
              className="no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label={t("public.copyLink")}
              title={t("public.copyLink")}
            >
              <Copy className="h-4 w-4 pointer-events-none" />
              <span className="hidden sm:inline">{copied ? t("publish.copied") : t("public.copyLink")}</span>
            </button>

            <a
              href={`/edit/${encodeURIComponent(id)}`}
              onClick={goEdit}
              data-ui="topbar-btn"
              className="no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label={t("public.edit")}
              title={t("public.edit")}
            >
              <Pencil className="h-4 w-4 pointer-events-none" />
              <span className="hidden sm:inline">{t("public.edit")}</span>
            </a>
          </div>
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
              <div
                className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: html }}
              />
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
