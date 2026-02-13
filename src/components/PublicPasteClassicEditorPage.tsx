import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Loader2, X } from "lucide-react";
import Editor from "./Editor";
import type { Doc } from "../lib/types";
import { deletePaste, getPaste, safeErrorText, updatePaste } from "../lib/rentryApi";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";

type Props = {
  id: string;
  onGoHome: () => void;
  onGoView: (id: string) => void;
  /** App-level personalization (same props as Editor). */
  appCss: string;
  appThemeId: string;
  appFontId: string;
  appMonoFontId: string;
  appBlocksEnabled: boolean;
  onUpdateAppSettings: (patch: { css: string; themeId: string; fontId: string; monoFontId: string; blocksEnabled: boolean }) => void;
};

const EDIT_CODE_RE = /^[0-9a-zA-Z]{12}$/;

function sessionKeyFor(id: string) {
  return `t-ext:editCode:${id}`;
}

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

function sanitizeBaseName(name: string) {
  const safe = (name || "Untitled")
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return safe || "Untitled";
}

async function exportMarkdown(filename: string, content: string) {
  // Electron (native save dialog)
  if (window.electronAPI?.saveMarkdown) {
    await window.electronAPI.saveMarkdown(filename, content);
    return;
  }
  // Browser fallback
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PublicPasteClassicEditorPage({
  id,
  onGoHome,
  onGoView,
  appCss,
  appThemeId,
  appFontId,
  appMonoFontId,
  appBlocksEnabled,
  onUpdateAppSettings
}: Props) {
  const { t, lang } = useI18n();
  const isIt = lang === "it";

  const origin = useMemo(() => {
    try {
      return window.location.origin || "";
    } catch {
      return "";
    }
  }, []);

  const viewUrl = useMemo(() => {
    const path = `/${encodeURIComponent(id)}`;
    return origin ? origin + path : path;
  }, [origin, id]);

  const [doc, setDoc] = useState<Doc>(() => ({
    id: `public:${id}`,
    title: t("public.untitled"),
    content: "",
    updatedAt: new Date().toISOString(),
    importedFrom: viewUrl
  }));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editCode, setEditCode] = useState<string>("");
  const [unlockOpen, setUnlockOpen] = useState<boolean>(true);

  // Load edit code from session storage or query param (?edit=CODE)
  useEffect(() => {
    let initial = "";

    try {
      const fromSession = sessionStorage.getItem(sessionKeyFor(id)) || "";
      if (EDIT_CODE_RE.test(fromSession)) initial = fromSession;
    } catch {
      // ignore
    }

    try {
      const u = new URL(window.location.href);
      const qp = u.searchParams.get("edit") || "";
      if (EDIT_CODE_RE.test(qp)) {
        initial = qp;
        u.searchParams.delete("edit");
        window.history.replaceState(null, "", u.toString());
      }
    } catch {
      // ignore
    }

    if (initial) {
      setEditCode(initial);
      setUnlockOpen(false);
    } else {
      setUnlockOpen(true);
    }
  }, [id]);

  // Fetch the published page content (no secret required).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const p = await getPaste(id);
        if (cancelled) return;

        setDoc(prev => ({
          ...prev,
          // keep id stable
          title: (p.title || "").trim() || t("public.untitled"),
          content: p.content || "",
          updatedAt: p.updatedAt || new Date().toISOString(),
          importedFrom: viewUrl
        }));
      } catch (e) {
        if (cancelled) return;
        setError(safeErrorText(e) || t("public.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t, viewUrl]);

  const canEdit = EDIT_CODE_RE.test(editCode);

  async function handleCopyLink() {
    await copyToClipboard(viewUrl);
  }

  function handleExit() {
    try {
      sessionStorage.removeItem(sessionKeyFor(id));
    } catch {
      // ignore
    }
    onGoView(id);
  }

  async function handleSave() {
    if (!canEdit || saving) return;
    setSaving(true);
    setError("");
    try {
      await updatePaste(id, editCode, doc.content);
      try {
        sessionStorage.setItem(sessionKeyFor(id), editCode);
      } catch {
        // ignore
      }
      setDoc(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
    } catch (e) {
      setError(safeErrorText(e) || t("public.error"));
      // If the code is wrong, keep the modal accessible.
      setUnlockOpen(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canEdit || deleting) return;
    const ok = window.confirm(t("public.confirmDelete"));
    if (!ok) return;
    setDeleting(true);
    setError("");
    try {
      await deletePaste(id, editCode);
      try {
        sessionStorage.removeItem(sessionKeyFor(id));
      } catch {
        // ignore
      }
      onGoHome();
    } catch (e) {
      setError(safeErrorText(e) || t("public.error"));
      setUnlockOpen(true);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="h-full">
      <Editor
        // Public pages should use the same editor surface, but with dedicated actions.
        sidebarOpen={false}
        onToggleSidebar={() => {}}
        hideSidebarToggle
        hideNewDoc
        hidePublish
        titleReadOnly
        doc={doc}
        onUpdateContent={(content) => setDoc(prev => ({ ...prev, content }))}
        onUpdateSettings={(patch) => setDoc(prev => ({ ...prev, ...patch }))}
        onRename={() => {}}
        onCreateDoc={() => onGoHome()}
        onExport={() => exportMarkdown(`${sanitizeBaseName(doc.title)}.md`, doc.content)}
        onImport={(text, sourcePathOrName) => {
          setDoc(prev => ({
            ...prev,
            content: text,
            importedFrom: sourcePathOrName || prev.importedFrom,
            importedAt: new Date().toISOString()
          }));
        }}
        appCss={appCss}
        appThemeId={appThemeId}
        appFontId={appFontId}
        appMonoFontId={appMonoFontId}
        appBlocksEnabled={appBlocksEnabled}
        onUpdateAppSettings={onUpdateAppSettings}
        publicEdit={{
          viewUrl,
          canEdit,
          saving,
          deleting,
          onExit: handleExit,
          onCopyLink: handleCopyLink,
          onSave: () => void handleSave(),
          onDelete: () => void handleDelete()
        }}
      />

      {/* Unlock modal (kept outside Editor so we don't end up with two different UIs) */}
      {createPortal(
        <AnimatePresence>
          {unlockOpen && (
            <motion.div
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/70"
                aria-label={isIt ? "Chiudi" : "Close"}
                onClick={() => setUnlockOpen(false)}
              />

              <motion.div
                role="dialog"
                aria-modal="true"
                className={cn(
                  "relative z-10 w-full max-w-[640px] overflow-hidden rounded-3xl",
                  "border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl"
                )}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-base font-semibold text-white/90">
                      <KeyRound className="h-4 w-4" />
                      {t("public.enterEditCodeTitle")}
                    </div>
                    <div className="mt-0.5 text-xs text-white/45">{t("public.enterEditCodeDesc")}</div>
                  </div>
                  <button
                    type="button"
                    className="rounded-2xl border border-white/10 bg-white/5 p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
                    aria-label={isIt ? "Chiudi" : "Close"}
                    onClick={() => setUnlockOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-5 py-4">
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-white/65">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("public.loading")}
                    </div>
                  ) : null}

                  <label className="mt-3 block text-xs text-white/55">{t("public.editCodePlaceholder")}</label>
                  <input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.trim())}
                    placeholder={t("public.editCodePlaceholder")}
                    className={cn(
                      "mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2",
                      "text-sm text-white/85 outline-none placeholder:text-white/35",
                      "focus:border-white/20 focus:ring-2 focus:ring-white/10"
                    )}
                    autoCapitalize="none"
                    autoCorrect="off"
                    inputMode="text"
                    spellCheck={false}
                  />

                  <div className="mt-3 text-xs text-white/45">{t("public.editPageHint")}</div>

                  {error ? (
                    <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100/90">
                      {error}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
                  <button
                    type="button"
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                    onClick={() => setUnlockOpen(false)}
                  >
                    {t("public.cancel")}
                  </button>

                  <button
                    type="button"
                    disabled={!EDIT_CODE_RE.test(editCode)}
                    className={cn(
                      "rounded-2xl border border-white/10 px-3 py-2 text-xs font-medium transition",
                      EDIT_CODE_RE.test(editCode)
                        ? "bg-white/10 text-white hover:bg-white/15"
                        : "bg-white/5 text-white/35 cursor-not-allowed"
                    )}
                    onClick={() => {
                      if (!EDIT_CODE_RE.test(editCode)) return;
                      try {
                        sessionStorage.setItem(sessionKeyFor(id), editCode);
                      } catch {
                        // ignore
                      }
                      setUnlockOpen(false);
                    }}
                  >
                    {t("public.unlockEdit")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
