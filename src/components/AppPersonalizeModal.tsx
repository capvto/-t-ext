import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { APP_THEMES } from "../lib/appThemes";
import { APP_FONTS, APP_MONO_FONTS } from "../lib/appFonts";
import { useI18n } from "../i18n";

type Props = {
  css: string;
  themeId: string;
  fontId: string;
  monoFontId: string;
  blocksEnabled: boolean;
  onClose: () => void;
  onApply: (patch: { css: string; themeId: string; fontId: string; monoFontId: string; blocksEnabled: boolean }) => void;
};

export default function AppPersonalizeModal({
  css: initialCss,
  themeId: initialThemeId,
  fontId: initialFontId,
  monoFontId: initialMonoFontId,
  blocksEnabled: initialBlocksEnabled,
  onClose,
  onApply
}: Props) {
  const { t } = useI18n();
  const [css, setCss] = useState(initialCss ?? "");
  const [presetThemeId, setPresetThemeId] = useState<string>(initialThemeId || "default");
  const [fontId, setFontId] = useState<string>(initialFontId || "default");
  const [monoFontId, setMonoFontId] = useState<string>(initialMonoFontId || "default");
  const [blocksEnabled, setBlocksEnabled] = useState<boolean>(!!initialBlocksEnabled);

  useEffect(() => {
    setCss(initialCss ?? "");
    setPresetThemeId(initialThemeId || "default");
    setFontId(initialFontId || "default");
    setMonoFontId(initialMonoFontId || "default");
    setBlocksEnabled(!!initialBlocksEnabled);
  }, [initialCss, initialThemeId, initialFontId, initialMonoFontId, initialBlocksEnabled]);

  const presetTheme = useMemo(
    () => APP_THEMES.find((th) => th.id === presetThemeId) ?? APP_THEMES[0],
    [presetThemeId]
  );

  const selectedFont = useMemo(
    () => APP_FONTS.find((f) => f.id === fontId) ?? APP_FONTS[0],
    [fontId]
  );

  const selectedMonoFont = useMemo(
    () => APP_MONO_FONTS.find((f) => f.id === monoFontId) ?? APP_MONO_FONTS[0],
    [monoFontId]
  );

  function commit(next?: Partial<{ css: string; themeId: string; fontId: string; monoFontId: string; blocksEnabled: boolean }>) {
    const patch = {
      css: next?.css ?? css,
      themeId: next?.themeId ?? presetThemeId ?? "default",
      fontId: next?.fontId ?? fontId ?? "default",
      monoFontId: next?.monoFontId ?? monoFontId ?? "default",
      blocksEnabled: typeof next?.blocksEnabled === "boolean" ? next.blocksEnabled : blocksEnabled
    };
    onApply(patch);
  }

  function applyPresetAppend() {
    const snippet = (presetTheme.css || "").trim();
    if (!snippet) return;
    setCss((prev) => {
      const prevTrim = (prev || "").trim();
      const nextCss = !prevTrim
        ? snippet + "\n"
        : prevTrim.replace(/\s+$/g, "") + "\n\n" + snippet + "\n";
      // Save immediately.
      commit({ css: nextCss, themeId: presetTheme.id });
      return nextCss;
    });
    setPresetThemeId(presetTheme.id);
  }

  function clearAll() {
    setCss("");
    setPresetThemeId("default");
    setFontId("default");
    setMonoFontId("default");
    setBlocksEnabled(false);
    commit({ css: "", themeId: "default", fontId: "default", monoFontId: "default", blocksEnabled: false });
  }

  function handleThemeClick(id: string) {
    const th = APP_THEMES.find((x) => x.id === id) ?? APP_THEMES[0];
    const nextCss = th?.css || "";
    setPresetThemeId(id);
    setCss(nextCss);
    // Save immediately when a preset is chosen.
    commit({ css: nextCss, themeId: id });
  }

  function handleClose() {
    // Save on close (useful when editing global CSS).
    commit();
    onClose();
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("personalize.close")}
        className="absolute inset-0 z-0 cursor-default bg-black/70"
        onClick={handleClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("personalize.title")}
        className={
          "relative z-10 w-full max-w-[920px] max-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl " +
          "border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-2xl flex flex-col"
        }
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-white/90">{t("personalize.title")}</div>
            <div className="mt-0.5 text-xs text-white/45">{t("personalize.subtitle")}</div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={t("personalize.close")}
            title={t("personalize.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-3">
          <div className="text-xs text-white/55">{t("personalize.hint")}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium text-white/90">{t("personalize.presetsTitle")}</div>
              <div className="mt-1 text-xs text-white/55">{t("personalize.presetsHint")}</div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {APP_THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleThemeClick(th.id)}
                    className={cn(
                      "no-drag rounded-2xl border px-3 py-2 text-left transition",
                      presetThemeId === th.id
                        ? "border-white/20 bg-white/10 ring-1 ring-white/10"
                        : "border-white/10 bg-white/5 hover:bg-white/8"
                    )}
                  >
                    <div className="text-xs font-semibold text-white/85">{t(th.nameKey)}</div>
                    <div className="mt-0.5 text-[11px] text-white/45">{t(th.descKey)}</div>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyPresetAppend}
                  className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  {t("personalize.presetsAppend")}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {t("personalize.presetsClear")}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium text-white/90">{t("personalize.fontTitle")}</div>
              <div className="mt-1 text-xs text-white/55">{t("personalize.fontHint")}</div>

              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white/75">{t("personalize.fontUiLabel")}</div>
                  <select
                    value={fontId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setFontId(next);
                      commit({ fontId: next });
                    }}
                    className={cn(
                      "no-drag w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs",
                      "text-white/85 outline-none focus:border-white/20"
                    )}
                  >
                    {APP_FONTS.map((f) => (
                      <option key={f.id} value={f.id} className="bg-zinc-900 text-white">
                        {t(f.nameKey)}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-white/45">{t(selectedFont.descKey)}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white/75">{t("personalize.fontMonoLabel")}</div>
                  <select
                    value={monoFontId}
                    onChange={(e) => {
                      const next = e.target.value;
                      setMonoFontId(next);
                      commit({ monoFontId: next });
                    }}
                    className={cn(
                      "no-drag w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs",
                      "text-white/85 outline-none focus:border-white/20"
                    )}
                  >
                    {APP_MONO_FONTS.map((f) => (
                      <option key={f.id} value={f.id} className="bg-zinc-900 text-white">
                        {t(f.nameKey)}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-white/45">{t(selectedMonoFont.descKey)}</div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-white/45">{t("personalize.fontScopeHint")}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-medium text-white/90">{t("personalize.blocksTitle")}</div>
              <div className="mt-1 text-xs text-white/55">{t("personalize.blocksHint")}</div>

              <label className="mt-3 inline-flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={blocksEnabled}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setBlocksEnabled(next);
                    commit({ blocksEnabled: next });
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-white/80 accent-white"
                />
                <span className="text-xs font-semibold text-white/75">{t("personalize.blocksLabel")}</span>
              </label>

              <div className="mt-2 text-[11px] text-white/45">{t("personalize.blocksHint2")}</div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-white/90">{t("personalize.cssTitle")}</div>
              <div className="text-xs text-white/55">{t("personalize.cssHint")}</div>
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                placeholder={t("personalize.cssPlaceholder")}
                className={cn(
                  "w-full min-h-[280px] resize-y rounded-2xl border border-white/10 bg-white/5 p-4",
                  "font-mono text-[12.5px] leading-relaxed text-white/85 outline-none",
                  "placeholder:text-white/35 focus:border-white/20"
                )}
              />
              <div className="text-[11px] text-white/45">{t("personalize.cssScopeHint")}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
