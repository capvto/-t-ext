import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cookie,
  Copy,
  Download,
  LayoutGrid,
  Plus,
  Save,
  Trash2,
  Upload,
  Paintbrush,
  SlidersHorizontal,
  Settings,
  Share2,
  X
} from "lucide-react";

import type { Doc } from "../lib/types";
import { cn } from "../lib/utils";
import MarkdownBlock from "./MarkdownBlock";
import PolicyModal from "./PolicyModal";
import ChangelogModal from "./ChangelogModal";
import CookieBanner from "./CookieBanner";
import { useInertialScroll } from "../hooks/useInertialScroll";
import { useI18n } from "../i18n";
import pkg from "../../package.json";
import NoteSettingsModal from "./NoteSettingsModal";
import AppPersonalizeModal from "./AppPersonalizeModal";
import PublishModal from "./PublishModal";
import { createMarkdownRenderer } from "../lib/markdown";
import { scopeCss } from "../lib/cssScope";

type Props = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  doc: Doc;
  onUpdateContent: (content: string) => void;
  onUpdateSettings: (patch: Pick<Doc, "customCss" | "markdownPlugins">) => void;
  onRename: (title: string) => void;
  onCreateDoc: () => void;
  onExport: () => void;
  onImport: (text: string, sourcePathOrName?: string) => void;
  appCss: string;
  appThemeId: string;
  appFontId: string;
  appMonoFontId: string;
  onUpdateAppSettings: (patch: { css: string; themeId: string; fontId: string; monoFontId: string }) => void;
  /**
   * When set, the editor behaves as the public-page editor ("/edit/:id").
   * We reuse the classic (t)ext UI but swap the top-right actions.
   */
  publicEdit?: {
    viewUrl: string;
    canEdit: boolean;
    saving?: boolean;
    deleting?: boolean;
    onExit: () => void;
    onCopyLink: () => void;
    onSave: () => void;
    onDelete: () => void;
  };
  /** Lock renaming in public edit mode (title comes from the published page). */
  titleReadOnly?: boolean;
  /** Hide doc-list toggle (public edit mode). */
  hideSidebarToggle?: boolean;
  /** Hide "Nuovo documento" (public edit mode). */
  hideNewDoc?: boolean;
  /** Hide publish button (public edit mode). */
  hidePublish?: boolean;
};

function normalizeContent(input: string | null | undefined): string {
  return String(input ?? "").replace(/\r\n/g, "\n");
}

function canonicalForCompare(input: string | null | undefined): string {
  const n = normalizeContent(input);
  return n.endsWith("\n") ? n.slice(0, -1) : n;
}

export default function Editor({
  sidebarOpen,
  onToggleSidebar,
  doc,
  onUpdateContent,
  onUpdateSettings,
  onRename,
  onCreateDoc,
  onExport,
  onImport,
  appCss,
  appThemeId,
  appFontId,
  appMonoFontId,
  onUpdateAppSettings,
  publicEdit,
  titleReadOnly,
  hideSidebarToggle,
  hideNewDoc,
  hidePublish
}: Props) {
  const { t, lang, setLang } = useI18n();
  const isMac = (window.electronAPI?.platform === "darwin") || /Mac/i.test(navigator.platform);
  const isElectron = !!window.electronAPI || /Electron/i.test(navigator.userAgent);
  const effectiveHideNewDoc = (hideNewDoc ?? !!publicEdit);
  const effectiveHidePublish = (hidePublish ?? !!publicEdit);
  const effectiveTitleReadOnly = (titleReadOnly ?? !!publicEdit);
  const [title, setTitle] = useState(doc.title);
  const [content, setContent] = useState(() => normalizeContent(doc.content));
  const [policyOpen, setPolicyOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [noteAdvancedOpen, setNoteAdvancedOpen] = useState(false);
  const [appPersonalizeOpen, setAppPersonalizeOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<{ top: number; left: number } | null>(null);

  const lastPushedContentRef = useRef<string>(doc.content);

  const prevDocIdRef = useRef<string>(doc.id);

  const scrollRef = useInertialScroll<HTMLDivElement>();
  const inputFileRef = useRef<HTMLInputElement | null>(null);

  const safeNoteId = useMemo(() => String(doc.id).replace(/[^\w-]/g, ""), [doc.id]);
  const noteScopeClass = useMemo(() => `note-scope-${safeNoteId}`, [safeNoteId]);

  const renderer = useMemo(
    () => createMarkdownRenderer(doc.markdownPlugins ?? []),
    // Plugins are only edited via the settings modal (not per-keystroke),
    // so a shallow dep on the array is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.id, doc.markdownPlugins]
  );

  const scopedCss = useMemo(() => {
    const combined = [doc.customCss, renderer.css].filter(Boolean).join("\n\n");
    if (!combined.trim()) return "";
    return scopeCss(combined, `.${noteScopeClass}`);
  }, [doc.customCss, renderer.css, noteScopeClass]);

  // When switching docs, rehydrate content
  useEffect(() => {
    setTitle(doc.title);
    const normalized = normalizeContent(doc.content);
    setContent(normalized);
    lastPushedContentRef.current = normalized;
    prevDocIdRef.current = doc.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  // If content is replaced externally (e.g. Import), update the editor
  useEffect(() => {
    const incoming = canonicalForCompare(doc.content);
    const last = canonicalForCompare(lastPushedContentRef.current);
    if (incoming === last) return;
    const normalized = normalizeContent(doc.content);
    setContent(normalized);
    lastPushedContentRef.current = normalized;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.content, doc.id]);

  // Keep parent in sync when content changes
  useEffect(() => {
    lastPushedContentRef.current = content;
    onUpdateContent(content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Title sync (debounced-ish via onBlur)
  useEffect(() => setTitle(doc.title), [doc.title]);

  // Close the settings menu with Escape
  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen]);

  // When the settings menu opens, compute its fixed position and keep it aligned
  // on window resizes. Rendering the menu in a portal avoids z-index/pointer-event
  // issues with glass/blur stacking contexts.
  useEffect(() => {
    if (!settingsOpen) return;
    refreshSettingsAnchor();
    const onResize = () => refreshSettingsAnchor();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [settingsOpen]);

  const docStats = useMemo(() => {
    const chars = content.length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    return { chars, words };
  }, [content]);

  async function handleImportAction() {
    if (window.electronAPI?.openMarkdown) {
      const res = await window.electronAPI.openMarkdown();
      if (res?.content != null) onImport(res.content, res.filePath);
      return;
    }
    inputFileRef.current?.click();
  }

  function refreshSettingsAnchor() {
    const rect = settingsBtnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const MENU_W = 260;
    const MARGIN = 12;
    const EST_H = 190;

    let left = rect.right - MENU_W;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - MENU_W - MARGIN));

    let top = rect.bottom + 8;
    if (top + EST_H > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, rect.top - 8 - EST_H);
    }

    setSettingsAnchor({ top, left });
  }

  return (
    // `min-h-0` is required so the scrollable canvas can shrink within the
    // surrounding flex column and enable `overflow-auto` scrolling.
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div
        className={cn(
          "titlebar relative flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3",
          // macOS traffic-lights live inside the webview when titleBarStyle is hiddenInset.
          // Add a safe inset so our controls never overlap them.
          isMac && "pt-8 pl-[88px]"
        )}
      >
        {!hideSidebarToggle ? (
          <div className="flex items-center gap-2">
            <GlassIconButton
              icon={<LayoutGrid className="h-4 w-4" />}
              label={sidebarOpen ? t("editor.closeDocs") : t("editor.openDocs")}
              onClick={onToggleSidebar}
            />
            <div className="hidden sm:block h-6 w-px bg-white/10" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={effectiveTitleReadOnly}
            onBlur={() => {
              if (!effectiveTitleReadOnly) onRename(title);
            }}
            placeholder={t("editor.titlePlaceholder")}
            className={cn(
              "no-drag w-full bg-transparent text-base font-medium outline-none placeholder:text-white/35",
              "text-white/90"
            )}
          />
          <div className="mt-0.5 text-[11px] text-white/45">
            {t("editor.stats", { words: docStats.words, chars: docStats.chars })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!effectiveHideNewDoc ? (
            <div className="hidden sm:block">
              <GlassIconButton
                icon={<Plus className="h-4 w-4" />}
                label={t("editor.newDoc")}
                onClick={onCreateDoc}
              />
            </div>
          ) : null}
          <div className="hidden sm:block">
            <GlassIconButton
              icon={<Download className="h-4 w-4" />}
              label={t("editor.export")}
              onClick={onExport}
            />
          </div>
          {!effectiveHidePublish && !isElectron && (
            <div className="hidden sm:block">
              <GlassIconButton
                icon={<Share2 className="h-4 w-4" />}
                label={t("publish.button")}
                onClick={() => setPublishOpen(true)}
              />
            </div>
          )}
          <div className="hidden sm:block">
            <GlassIconButton
              icon={<Upload className="h-4 w-4" />}
              label={t("editor.import")}
              onClick={handleImportAction}
            />
          </div>

          {publicEdit ? (
            <>
              <div className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
              <GlassIconButton
                icon={<Copy className="h-4 w-4" />}
                label={t("public.copyLink")}
                onClick={publicEdit.onCopyLink}
              />
              <GlassIconButton
                icon={<X className="h-4 w-4" />}
                label={t("public.exitEdit")}
                onClick={publicEdit.onExit}
              />
              <GlassIconButton
                icon={<Save className="h-4 w-4" />}
                label={publicEdit.saving ? t("public.saving") : t("public.save")}
                disabled={!publicEdit.canEdit || !!publicEdit.saving}
                onClick={publicEdit.onSave}
              />
              <GlassIconButton
                icon={<Trash2 className="h-4 w-4" />}
                label={t("public.delete")}
                disabled={!publicEdit.canEdit || !!publicEdit.deleting}
                onClick={publicEdit.onDelete}
                variant="danger"
              />
            </>
          ) : null}

          {/* Settings menu */}
          <div className="relative">
            <GlassIconOnlyButton
              ref={settingsBtnRef}
              icon={<Settings className="h-4 w-4" />}
              label={t("menu.settings")}
              onClick={() => {
                if (!settingsOpen) refreshSettingsAnchor();
                setSettingsOpen(v => !v);
              }}
              pressed={settingsOpen}
            />

            {/* Render the menu in a portal so it always sits above glass/blur layers and remains clickable */}
            {createPortal(
              <AnimatePresence>
                {settingsOpen && settingsAnchor && (
                  <>
                    {/* Click-outside overlay */}
                    <motion.button
                      key="settings-overlay"
                      className="fixed inset-0 z-[9990] cursor-default bg-black/45"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSettingsOpen(false)}
                      aria-label={t("menu.close")}
                    />

                    <motion.div
                      key="settings-menu"
                      className="fixed z-[9991] w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
                      style={{ top: settingsAnchor.top, left: settingsAnchor.left }}
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      <div className="p-2">
                        <MenuItem
                          icon={<Paintbrush className="h-4 w-4" />}
                          label={t("personalize.button")}
                          onClick={() => { setAppPersonalizeOpen(true); setSettingsOpen(false); }}
                        />
                        <MenuItem
                          icon={<SlidersHorizontal className="h-4 w-4" />}
                          label={t("custom.button")}
                          onClick={() => { setNoteAdvancedOpen(true); setSettingsOpen(false); }}
                        />
                      </div>

                      <div className="border-t border-white/10 p-2 sm:hidden">
                        {!effectiveHideNewDoc ? (
                          <MenuItem
                            icon={<Plus className="h-4 w-4" />}
                            label={t("editor.newDoc")}
                            onClick={() => {
                              setSettingsOpen(false);
                              onCreateDoc();
                            }}
                          />
                        ) : null}
                        <MenuItem
                          icon={<Download className="h-4 w-4" />}
                          label={t("editor.export")}
                          onClick={() => {
                            setSettingsOpen(false);
                            onExport();
                          }}
                        />
                        <MenuItem
                          icon={<Upload className="h-4 w-4" />}
                          label={t("editor.import")}
                          onClick={() => {
                            setSettingsOpen(false);
                            void handleImportAction();
                          }}
                        />
                        {!effectiveHidePublish && !isElectron ? (
                          <MenuItem
                            icon={<Share2 className="h-4 w-4" />}
                            label={t("publish.button")}
                            onClick={() => {
                              setSettingsOpen(false);
                              setPublishOpen(true);
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="border-t border-white/10 p-2">
                        <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                          {t("language.label")}
                        </div>
                        <div className="flex items-center gap-1 px-1">
                          <MenuPill active={lang === "it"} onClick={() => setLang("it")}>IT</MenuPill>
                          <MenuPill active={lang === "en"} onClick={() => setLang("en")}>EN</MenuPill>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>
          <input
            ref={inputFileRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            // Don't use display:none here: some Chromium/Electron builds can
            // block programmatic clicks on fully hidden file inputs.
            // `sr-only` keeps it accessible without affecting layout.
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => {
                const t = String(reader.result ?? "");
                onImport(t, f.name);
              };
              reader.readAsText(f);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          className={cn(
            // `overscroll-contain` avoids rubber-banding the whole window in some
            // Electron/macOS builds when reaching the top/bottom.
            // Use only vertical overflow: horizontal trackpad gestures should not
            // create accidental sideways scrolling.
            "app-canvas h-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-6 sm:px-8"
          )}
        >
          <div className={cn("mx-auto w-full max-w-[860px]", noteScopeClass)} data-note-id={doc.id}>
            {scopedCss ? <style>{scopedCss}</style> : null}
            <MarkdownBlock
              key={doc.id}
              text={content}
              render={renderer.render}
              onChange={setContent}
            />

            
{/* Footer hint */}
				<div className="mt-10 text-center text-xs text-white/35">
				  <div>
				    (t)ext <button type="button" onClick={() => setChangelogOpen(true)} className="no-drag text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white">v{pkg.version.replace(/-/g, " ")}</button>{" "}<span className="text-white/25">·</span>{" "}{t("editor.footerBy")}{" "}
                    <a
                      href="https://www.matteocaputo.dev/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                    >
                      Matteo Caputo
                    </a>{" "}
                    <span className="text-white/25">·</span>{" "}
                    <a
                      href="https://davialessio.dev/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                    >
                      Alessio Daví
                    </a>{" "}
                    <span className="text-white/25">·</span>{" "}
                    <a
                      href="https://manuelzambelli.it/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                    >
                      Manuel Zambelli
                    </a>
				  </div>
  <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
    <button
      type="button"
      onClick={() => setPolicyOpen(true)}
      data-legal="policy-link"
      className="no-drag inline-flex items-center gap-1.5 text-white/55 underline decoration-white/20 underline-offset-4 transition hover:text-white"
    >
      <Cookie className="h-3.5 w-3.5" />
      {t("editor.policyLink")}
    </button>
  </div>
</div>
</div>
        </div>

        
{/* Subtle bottom glow */}
<div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

<CookieBanner onOpenPolicy={() => setPolicyOpen(true)} />

<AnimatePresence>
  {policyOpen && (
    <PolicyModal key="policy" onClose={() => setPolicyOpen(false)} />
  )}
</AnimatePresence>

<AnimatePresence>
  {changelogOpen && (
    <ChangelogModal key="changelog" onClose={() => setChangelogOpen(false)} />
  )}
</AnimatePresence>

<AnimatePresence>
  {noteAdvancedOpen && (
    <NoteSettingsModal
      key="settings"
      doc={doc}
      pluginErrors={renderer.errors}
      onClose={() => setNoteAdvancedOpen(false)}
      onApply={(patch) => onUpdateSettings(patch)}
    />
  )}
</AnimatePresence>

<AnimatePresence>
  {appPersonalizeOpen && (
    <AppPersonalizeModal
      key="personalize"
      css={appCss}
      themeId={appThemeId}
      fontId={appFontId}
      monoFontId={appMonoFontId}
      onClose={() => setAppPersonalizeOpen(false)}
      onApply={(patch) => onUpdateAppSettings(patch)}
    />
  )}
</AnimatePresence>
<AnimatePresence>
  {!isElectron && publishOpen && (
    <PublishModal
      key="publish"
      title={title}
      content={content}
      onClose={() => setPublishOpen(false)}
    />
  )}
</AnimatePresence>

      </div>
    </div>
  );
}

function GlassIconButton({
  icon,
  label,
  onClick,
  disabled,
  variant = "default"
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      data-ui="topbar-btn"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "no-drag",
        "group relative inline-flex items-center justify-center rounded-2xl border border-white/10",
        variant === "danger" ? "bg-red-500/10" : "bg-white/5",
        "min-h-[44px] min-w-[44px] px-3 py-2 text-white/80 shadow-glass backdrop-blur-xl transition",
        !disabled && (variant === "danger" ? "hover:bg-red-500/15 hover:text-white" : "hover:bg-white/10 hover:text-white"),
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label={label}
      title={label}
    >
      <span className="grid place-items-center">{icon}</span>
      <span className="ml-2 hidden text-xs font-medium sm:inline">{label}</span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 bg-gradient-to-b from-white/10 to-transparent" />
    </button>
  );
}


const GlassIconOnlyButton = forwardRef<HTMLButtonElement, {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}>(function GlassIconOnlyButton({ icon, label, onClick, pressed }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      data-ui="topbar-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "no-drag",
        "group relative inline-flex items-center justify-center rounded-2xl border border-white/10",
        "min-h-[44px] min-w-[44px] bg-white/5 p-2.5 text-white/80 shadow-glass backdrop-blur-xl transition",
        "hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        pressed && "bg-white/10 text-white"
      )}
    >
      <span className="grid place-items-center">{icon}</span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition group-hover:opacity-100 bg-gradient-to-b from-white/10 to-transparent" />
    </button>
  );
});

function MenuItem({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
    >
      <span className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/80">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </span>
    </button>
  );
}

function MenuPill({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-1.5 text-[11px] font-semibold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        active ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/8 hover:text-white/85"
      )}
    >
      {children}
    </button>
  );
}
