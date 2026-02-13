import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import type { Doc, MarkdownPluginSpec } from "../lib/types";
import { cn, uid } from "../lib/utils";
import { NOTE_THEMES } from "../lib/noteThemes";
import { useI18n } from "../i18n";

type Props = {
  doc: Doc;
  pluginErrors?: Record<string, string>;
  onClose: () => void;
  onApply: (patch: Pick<Doc, "customCss" | "markdownPlugins">) => void;
};

const TEMPLATE_BASIC = `// Example: custom markers + simple alignment\n//\n// 1) !ciao! => adds letter spacing\n// 2) -> Ciao -> => right aligned block\n//\n// The script MUST end with: return { ... }\n\nreturn {\n  name: \"My extensions\",\n  css: \`\n    .spaced { letter-spacing: .14em; }\n    .right  { text-align: right; }\n  \`,\n  transform(markdown, api) {\n    // Inline: !text!\n    markdown = markdown.replace(/!([^!\\n]+)!/g, (_m, txt) => {\n      return api.inline(txt, \"spaced\");\n    });\n\n    // Block: -> ... -> (whole line)\n    markdown = markdown.replace(/^->\\s*(.*?)\\s*->$/gm, (_m, txt) => {\n      return api.block(txt, \"right\");\n    });\n\n    return markdown;\n  }\n};\n`;

const TEMPLATE_MD_IT = `// Advanced example: register a markdown-it rule\n// This creates a very small syntax: ==text== becomes <mark>text</mark>\n//\n// NOTE: this is just a demo. Prefer transform() for quick wins.\n\nreturn {\n  name: \"Mark\",\n  css: \`mark { padding: 0 .18em; border-radius: .35em; background: rgba(255,255,255,.12); }\`,\n  sanitize: { addTags: [\"mark\"] },\n  use(md) {\n    md.inline.ruler.before(\"emphasis\", \"mark\", (state, silent) => {\n      const start = state.pos;\n      if (state.src.slice(start, start + 2) !== \"==\") return false;\n      const end = state.src.indexOf(\"==\", start + 2);\n      if (end === -1) return false;\n      if (!silent) {\n        const tokenOpen = state.push(\"mark_open\", \"mark\", 1);\n        tokenOpen.markup = \"==\";\n        const text = state.src.slice(start + 2, end);\n        const tokenText = state.push(\"text\", \"\", 0);\n        tokenText.content = text;\n        const tokenClose = state.push(\"mark_close\", \"mark\", -1);\n        tokenClose.markup = \"==\";\n      }\n      state.pos = end + 2;\n      return true;\n    });\n  }\n};\n`;

export default function NoteSettingsModal({ doc, pluginErrors = {}, onClose, onApply }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"css" | "plugins">("css");

  const [css, setCss] = useState(doc.customCss ?? "");
  const [presetThemeId, setPresetThemeId] = useState<string>("default");
  const [plugins, setPlugins] = useState<MarkdownPluginSpec[]>(doc.markdownPlugins ?? []);
  const [activePluginId, setActivePluginId] = useState<string | null>(plugins[0]?.id ?? null);

  // Rehydrate when switching docs
  useEffect(() => {
    setCss(doc.customCss ?? "");
    setPresetThemeId("default");
    setPlugins(doc.markdownPlugins ?? []);
    setActivePluginId((doc.markdownPlugins ?? [])[0]?.id ?? null);
    setTab("css");
  }, [doc.id]);

  const activePlugin = useMemo(
    () => (plugins.find(p => p.id === activePluginId) ?? (plugins[0] ?? null)),
    [plugins, activePluginId]
  );


const presetTheme = useMemo(
  () => NOTE_THEMES.find(th => th.id === presetThemeId) ?? NOTE_THEMES[0],
  [presetThemeId]
);

function applyPresetReplace() {
  setCss(presetTheme.css || "");
}

function applyPresetAppend() {
  const snippet = (presetTheme.css || "").trim();
  if (!snippet) return;
  setCss(prev => {
    const prevTrim = (prev || "").trim();
    if (!prevTrim) return snippet + "\n";
    return prevTrim.replace(/\s+$/g, "") + "\n\n" + snippet + "\n";
  });
}

function clearCss() {
  setCss("");
}

  function apply() {
    onApply({
      customCss: css,
      markdownPlugins: plugins
    });
  }

  function saveAndClose() {
    apply();
    onClose();
  }

  function addPlugin() {
    const p: MarkdownPluginSpec = {
      id: uid(),
      name: t("custom.pluginNew"),
      enabled: true,
      code: TEMPLATE_BASIC
    };
    setPlugins(prev => [p, ...prev]);
    setActivePluginId(p.id);
    setTab("plugins");
  }

  function deletePlugin(id: string) {
    setPlugins(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activePluginId === id) setActivePluginId(next[0]?.id ?? null);
      return next;
    });
  }

  function updatePlugin(id: string, patch: Partial<MarkdownPluginSpec>) {
    setPlugins(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }

  const activeError = activePlugin ? pluginErrors[activePlugin.id] : "";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t("custom.close")}
        className="absolute inset-0 z-0 cursor-default bg-black/70"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t("custom.title")}
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
            <div className="text-base font-semibold text-white/90">{t("custom.title")}</div>
            <div className="mt-0.5 text-xs text-white/45">
              {t("custom.subtitle", { title: doc.title || "Untitled" })}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label={t("custom.close")}
            title={t("custom.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <TabButton active={tab === "css"} onClick={() => setTab("css")}>
            {t("custom.tabTheme")}
          </TabButton>
          <TabButton active={tab === "plugins"} onClick={() => setTab("plugins")}>
            {t("custom.tabPlugins")}
          </TabButton>

          <div className="flex-1" />

          <button
            type="button"
            onClick={apply}
            className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {t("custom.apply")}
          </button>
          <button
            type="button"
            onClick={saveAndClose}
            className="no-drag rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/12"
          >
            {t("custom.saveClose")}
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          {tab === "css" ? (
<div className="space-y-4">
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div className="text-sm font-medium text-white/90">{t("custom.presetsTitle")}</div>
    <div className="mt-1 text-xs text-white/55">{t("custom.presetsHint")}</div>

    <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
      {NOTE_THEMES.map((th) => (
        <button
          key={th.id}
          type="button"
          onClick={() => setPresetThemeId(th.id)}
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
        onClick={applyPresetReplace}
        className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        {t("custom.presetsUse")}
      </button>
      <button
        type="button"
        onClick={applyPresetAppend}
        className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        {t("custom.presetsAppend")}
      </button>
      <button
        type="button"
        onClick={clearCss}
        className="no-drag rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        {t("custom.presetsClear")}
      </button>
    </div>
  </div>

  <div className="space-y-3">
    <div className="text-sm font-medium text-white/90">{t("custom.themeTitle")}</div>
    <div className="text-xs text-white/55">{t("custom.themeHint")}</div>
    <textarea
      value={css}
      onChange={(e) => setCss(e.target.value)}
      placeholder={t("custom.themePlaceholder")}
      className={cn(
        "w-full min-h-[260px] resize-y rounded-2xl border border-white/10 bg-white/5 p-4",
        "font-mono text-[12.5px] leading-relaxed text-white/85 outline-none",
        "placeholder:text-white/35 focus:border-white/20"
      )}
    />
    <div className="text-[11px] text-white/45">{t("custom.themeScopeHint")}</div>
  </div>
</div>

          ) : (
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              {/* List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-white/90">{t("custom.pluginsTitle")}</div>
                  <button
                    type="button"
                    onClick={addPlugin}
                    className="no-drag inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    {t("custom.addPlugin")}
                  </button>
                </div>
                <div className="text-xs text-white/55">{t("custom.pluginsHint")}</div>

                <div className="space-y-2">
                  {plugins.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/55">
                      {t("custom.pluginsEmpty")}
                    </div>
                  ) : (
                    plugins.map((p) => {
                      const hasErr = Boolean(pluginErrors[p.id]);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActivePluginId(p.id)}
                          className={cn(
                            "no-drag w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition",
                            "hover:bg-white/8",
                            activePluginId === p.id && "bg-white/10 ring-1 ring-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-white/85">{p.name || t("custom.pluginUnnamed")}</div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
                                <span className={p.enabled ? "text-emerald-300/80" : "text-white/35"}>
                                  {p.enabled ? t("custom.enabledOn") : t("custom.enabledOff")}
                                </span>
                                {hasErr ? <span className="text-rose-300/80">{t("custom.error")}</span> : null}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Editor */}
              <div className="space-y-3">
                {activePlugin ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          value={activePlugin.name}
                          onChange={(e) => updatePlugin(activePlugin.id, { name: e.target.value })}
                          className="w-[min(420px,100%)] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-white/20"
                          placeholder={t("custom.pluginNamePlaceholder")}
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-white/70">
                          <input
                            type="checkbox"
                            checked={activePlugin.enabled}
                            onChange={(e) => updatePlugin(activePlugin.id, { enabled: e.target.checked })}
                          />
                          {t("custom.enabled")}
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/85 outline-none"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") return;
                            updatePlugin(activePlugin.id, {
                              code: v === "basic" ? TEMPLATE_BASIC : TEMPLATE_MD_IT
                            });
                            e.currentTarget.value = "";
                          }}
                          defaultValue=""
                        >
                          <option value="">{t("custom.template")}</option>
                          <option value="basic">{t("custom.templateBasic")}</option>
                          <option value="mdit">{t("custom.templateMdit")}</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => deletePlugin(activePlugin.id)}
                          className="no-drag inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("custom.delete")}
                        </button>
                      </div>
                    </div>

                    {activeError ? (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200/90">
                        <div className="font-semibold">{t("custom.error")}</div>
                        <div className="mt-1 whitespace-pre-wrap break-words">{activeError}</div>
                      </div>
                    ) : null}

                    <textarea
                      value={activePlugin.code}
                      onChange={(e) => updatePlugin(activePlugin.id, { code: e.target.value })}
                      placeholder={t("custom.pluginCodePlaceholder")}
                      className={cn(
                        "w-full min-h-[380px] resize-y rounded-2xl border border-white/10 bg-white/5 p-4",
                        "font-mono text-[12.5px] leading-relaxed text-white/85 outline-none",
                        "placeholder:text-white/35 focus:border-white/20"
                      )}
                    />
                    <div className="text-[11px] text-white/45">{t("custom.pluginFooterHint")}</div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                    {t("custom.pluginsSelect")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "no-drag rounded-2xl border px-3 py-2 text-xs font-semibold transition",
        active
          ? "border-white/15 bg-white/10 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
