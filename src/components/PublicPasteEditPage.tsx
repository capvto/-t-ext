import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { ArrowLeft, Copy, KeyRound, Lock, Save, Trash2 } from "lucide-react";
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

const EDIT_CODE_RE = /^[0-9a-zA-Z]{12}$/;

function extractEditCode(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";

  // Allow pasting the whole edit URL.
  try {
    const u = new URL(raw);
    const code = (u.searchParams.get("edit") || "").trim();
    if (code) return code;
  } catch {
    // not a URL
  }

  // Or a query fragment.
  const m = raw.match(/[?&]edit=([0-9a-zA-Z]{12})/);
  if (m?.[1]) return m[1];

  // Otherwise assume it's the code itself.
  return raw;
}

function safeSessionGet(key: string): string {
  try {
    return (sessionStorage.getItem(key) || "").trim();
  } catch {
    return "";
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeSessionRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function stripSecretFromUrl() {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("edit")) return;
    u.searchParams.delete("edit");
    const qs = u.searchParams.toString();
    const next = u.pathname + (qs ? `?${qs}` : "") + u.hash;
    window.history.replaceState({}, "", next);
  } catch {
    // ignore
  }
}

export default function PublicPasteEditPage({
  id,
  onGoHome,
  onGoView
}: {
  id: string;
  onGoHome?: () => void;
  onGoView?: (id: string) => void;
}) {
  const { t } = useI18n();

  const DEV = import.meta.env.DEV;
  const devLog = (...args: any[]) => {
    if (!DEV) return;
    // eslint-disable-next-line no-console
    console.debug("[t-ext/public-edit]", ...args);
  };

  const origin = useMemo(() => {
    try {
      return window.location.origin || "";
    } catch {
      return "";
    }
  }, []);

  const viewUrl = useMemo(() => {
    const safe = encodeURIComponent(id || "");
    // Viewer route uses /:slug (preferred). Legacy /p/:id still works.
    return `${origin}/${safe}`;
  }, [origin, id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [editInput, setEditInput] = useState<string>(() => {
    // Prefer session storage if the user already unlocked elsewhere.
    const cached = safeSessionGet(`t-ext:editCode:${id}`);
    return cached || "";
  });

  const editCode = useMemo(() => {
    const extracted = extractEditCode(editInput);
    return extracted;
  }, [editInput]);

  const unlocked = EDIT_CODE_RE.test(editCode);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Allow ?edit=CODE on this page, but never keep it in the address bar.
  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search || "");
      const fromQuery = (qs.get("edit") || "").trim();
      if (EDIT_CODE_RE.test(fromQuery)) {
        setEditInput(fromQuery);
        safeSessionSet(`t-ext:editCode:${id}`, fromQuery);
        stripSecretFromUrl();
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Persist valid edit code (session-only).
  useEffect(() => {
    const key = `t-ext:editCode:${id}`;
    if (EDIT_CODE_RE.test(editCode)) safeSessionSet(key, editCode);
    else safeSessionRemove(key);
  }, [id, editCode]);

  // Focus the textarea once unlocked.
  useEffect(() => {
    if (!unlocked) return;
    const el = textareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        el.focus();
      } catch {
        // ignore
      }
    });
  }, [unlocked]);

  const goView = (e?: MouseEvent) => {
    if (e) e.preventDefault();
    if (onGoView) onGoView(id);
    else window.location.href = `/${encodeURIComponent(id)}`;
  };

  const goHome = (e?: MouseEvent) => {
    if (e) e.preventDefault();
    if (onGoHome) onGoHome();
    else window.location.href = "/";
  };

  const onSave = async () => {
    if (!unlocked || saving) return;
    setSaving(true);
    setErr("");
    devLog("save: start");
    try {
      const r = await updatePaste(id, editCode, content);
      setUpdatedAt(r.updatedAt || new Date().toISOString());
      devLog("save: ok");
    } catch (e: any) {
      devLog("save: error");
      setErr(safeErrorText(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!unlocked || deleting) return;
    if (!confirm(t("public.confirmDelete"))) return;
    setDeleting(true);
    setErr("");
    devLog("delete: start");
    try {
      await deletePaste(id, editCode);
      devLog("delete: ok");
      // After delete, return home (or view, which will now 404).
      goHome();
    } catch (e: any) {
      devLog("delete: error");
      setErr(safeErrorText(e));
    } finally {
      setDeleting(false);
    }
  };

  const onExit = () => {
    // "Exit" behaves like locking edit mode: clear the secret from this session
    // and return to the public viewer, so we keep a single editing UI.
    safeSessionRemove(`t-ext:editCode:${id}`);
    setEditInput("");
    goView();
  };

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="relative z-30 border-b border-white/10 bg-[var(--app-titlebar)] backdrop-blur-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <a
            href={`/${encodeURIComponent(id)}`}
            onClick={goView}
            data-ui="topbar-btn"
            className="no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            aria-label={t("public.back")}
            title={t("public.back")}
          >
            <ArrowLeft className="h-4 w-4 pointer-events-none" />
            <span className="hidden sm:inline">{t("public.back")}</span>
          </a>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white/90">
              {title?.trim() ? title : t("public.untitled")}
            </div>
            <div className="mt-0.5 text-[11px] text-white/45">
              {updatedAt ? t("public.updatedAt", { date: new Date(updatedAt).toLocaleString() }) : " "}
            </div>
          </div>

          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              data-ui="topbar-btn"
              onClick={async () => {
                const ok = await copyToClipboard(viewUrl);
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

            <button
              type="button"
              data-ui="topbar-btn"
              onClick={onExit}
              className="no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label={t("public.exitEdit")}
              title={t("public.exitEdit")}
            >
              <Lock className="h-4 w-4 pointer-events-none" />
              <span className="hidden sm:inline">{t("public.exitEdit")}</span>
            </button>

            <button
              type="button"
              data-ui="topbar-btn"
              disabled={!unlocked || saving || loading}
              onClick={onSave}
              className={cn(
                "no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm",
                !unlocked || saving || loading
                  ? "bg-white/5 text-white/40"
                  : "bg-white/10 text-white/85 transition hover:bg-white/15 hover:text-white"
              )}
              aria-label={t("public.save")}
              title={t("public.save")}
            >
              <Save className="h-4 w-4 pointer-events-none" />
              <span className="hidden sm:inline">{saving ? t("public.saving") : t("public.save")}</span>
            </button>

            <button
              type="button"
              data-ui="topbar-btn"
              disabled={!unlocked || deleting}
              onClick={onDelete}
              className={cn(
                "no-drag inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm",
                !unlocked || deleting
                  ? "bg-white/5 text-white/40"
                  : "bg-white/5 text-white/70 transition hover:bg-red-500/15 hover:text-red-200"
              )}
              aria-label={t("public.delete")}
              title={t("public.delete")}
            >
              <Trash2 className="h-4 w-4 pointer-events-none" />
              <span className="hidden sm:inline">{t("public.delete")}</span>
            </button>

            <a
              href="/"
              onClick={goHome}
              data-ui="topbar-btn"
              className="no-drag hidden sm:inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Home"
              title="Home"
            >
              Home
            </a>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-[980px] p-4 sm:p-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-glass backdrop-blur-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                  <KeyRound className="h-4 w-4 pointer-events-none" />
                  {t("public.enterEditCodeTitle")}
                </div>
                <div className="mt-1 text-xs text-white/45">{t("public.enterEditCodeDesc")}</div>
              </div>

              <div className="w-full sm:max-w-[360px]">
                <input
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  placeholder={t("public.editCodePlaceholder")}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-2 text-sm outline-none transition",
                    "bg-black/30 text-white/90 placeholder:text-white/30",
                    unlocked ? "border-white/15 focus:border-white/25" : "border-red-500/30 focus:border-red-500/40"
                  )}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {!unlocked && editInput.trim() ? (
                  <div className="mt-2 text-xs text-red-300/80">{t("public.invalidEditCode")}</div>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs font-medium text-white/60">{t("public.markdownLabel")}</div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                readOnly={!unlocked}
                className={cn(
                  "min-h-[55vh] w-full resize-none rounded-3xl border p-4 text-sm leading-relaxed outline-none",
                  "bg-black/30 text-white/90 placeholder:text-white/30",
                  "font-mono",
                  unlocked
                    ? "border-white/10 focus:border-white/20"
                    : "border-white/10 opacity-70"
                )}
              />
              {!unlocked ? (
                <div className="mt-3 text-xs text-white/45">
                  {t("public.editPageHint")}
                </div>
              ) : null}
            </div>

            {loading ? (
              <div className="mt-4 text-sm text-white/45">{t("public.loading")}</div>
            ) : null}

            {err ? (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
                {t("public.error")}: {err}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
