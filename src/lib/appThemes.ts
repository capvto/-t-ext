export type AppTheme = {
  id: string;
  /** i18n key for the theme display name */
  nameKey: string;
  /** i18n key for the short description */
  descKey: string;
  /** CSS snippet (scoped automatically to the app root) */
  css: string;
};

// Global theme presets.
// They work by setting a small set of CSS variables and overriding a few
// Tailwind utility classes used throughout the UI.
//
// NOTE: This CSS will be scoped to `.app-root` at runtime, so users can also
// write `:root { ... }` and it will apply to the app surface.

function preset(vars: {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  accent: string;
  accentSoft: string;
  titlebar?: string;
}) {
  return `/* (t)ext — App theme preset */

:root {
  --app-bg: ${vars.bg};
  --app-surface: ${vars.surface};
  --app-surface2: ${vars.surface2};
  --app-surface3: ${vars.surface3};
  --app-border: ${vars.border};
  --app-accent: ${vars.accent};
  --app-accent-soft: ${vars.accentSoft};
  --app-titlebar: ${vars.titlebar ?? "rgba(0,0,0,.18)"};
}

.app-root {
  background: radial-gradient(1200px 600px at 50% 0%, rgba(255,255,255,0.06), transparent 60%), var(--app-bg) !important;
}

.app-root .titlebar {
  background: var(--app-titlebar);
  backdrop-filter: blur(18px);
}

.app-root .border-white\\/10 { border-color: var(--app-border) !important; }
.app-root .bg-white\\/6 { background-color: var(--app-surface) !important; }
.app-root .bg-white\\/5 { background-color: var(--app-surface2) !important; }
.app-root .bg-white\\/8 { background-color: var(--app-surface3) !important; }

.app-root .prose a,
.app-root a[data-legal="policy-link"] {
  color: var(--app-accent) !important;
  text-decoration-color: rgba(255,255,255,.25);
}

.app-root ::selection { background: var(--app-accent-soft); }

/* Small polish for code blocks */
.app-root .codewrap .copy-btn {
  border-color: var(--app-border) !important;
}
`;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: "default",
    nameKey: "appThemes.default.name",
    descKey: "appThemes.default.desc",
    css: ""
  },
  {
    id: "obsidian",
    nameKey: "appThemes.obsidian.name",
    descKey: "appThemes.obsidian.desc",
    css: preset({
      bg: "#0B0D10",
      surface: "rgba(255,255,255,.06)",
      surface2: "rgba(255,255,255,.05)",
      surface3: "rgba(255,255,255,.08)",
      border: "rgba(255,255,255,.11)",
      accent: "rgba(167, 139, 250, .95)",
      accentSoft: "rgba(167, 139, 250, .22)",
      titlebar: "rgba(16, 10, 26, .35)"
    })
  },
  {
    id: "nord",
    nameKey: "appThemes.nord.name",
    descKey: "appThemes.nord.desc",
    css: preset({
      bg: "#0B1220",
      surface: "rgba(136, 192, 208, .08)",
      surface2: "rgba(136, 192, 208, .06)",
      surface3: "rgba(136, 192, 208, .10)",
      border: "rgba(136, 192, 208, .18)",
      accent: "rgba(136, 192, 208, .95)",
      accentSoft: "rgba(136, 192, 208, .22)",
      titlebar: "rgba(8, 18, 32, .45)"
    })
  },
  {
    id: "dracula",
    nameKey: "appThemes.dracula.name",
    descKey: "appThemes.dracula.desc",
    css: preset({
      bg: "#0E0B14",
      surface: "rgba(189, 147, 249, .08)",
      surface2: "rgba(189, 147, 249, .06)",
      surface3: "rgba(255, 121, 198, .10)",
      border: "rgba(189, 147, 249, .20)",
      accent: "rgba(255, 121, 198, .95)",
      accentSoft: "rgba(255, 121, 198, .22)",
      titlebar: "rgba(22, 16, 38, .55)"
    })
  },
  {
    id: "solarized",
    nameKey: "appThemes.solarized.name",
    descKey: "appThemes.solarized.desc",
    css: preset({
      bg: "#002B36",
      surface: "rgba(38, 139, 210, .10)",
      surface2: "rgba(38, 139, 210, .07)",
      surface3: "rgba(42, 161, 152, .10)",
      border: "rgba(147, 161, 161, .22)",
      accent: "rgba(42, 161, 152, .95)",
      accentSoft: "rgba(42, 161, 152, .22)",
      titlebar: "rgba(0, 43, 54, .65)"
    })
  },
  {
    id: "paper",
    nameKey: "appThemes.paper.name",
    descKey: "appThemes.paper.desc",
    css: preset({
      bg: "#0D0B08",
      surface: "rgba(251, 191, 36, .10)",
      surface2: "rgba(251, 191, 36, .07)",
      surface3: "rgba(251, 191, 36, .12)",
      border: "rgba(251, 191, 36, .22)",
      accent: "rgba(251, 191, 36, .95)",
      accentSoft: "rgba(251, 191, 36, .22)",
      titlebar: "rgba(20, 14, 6, .60)"
    })
  },
  {
    id: "high-contrast",
    nameKey: "appThemes.highContrast.name",
    descKey: "appThemes.highContrast.desc",
    css: preset({
      bg: "#050505",
      surface: "rgba(255,255,255,.09)",
      surface2: "rgba(255,255,255,.07)",
      surface3: "rgba(255,255,255,.12)",
      border: "rgba(255,255,255,.22)",
      accent: "rgba(99, 102, 241, .95)",
      accentSoft: "rgba(99, 102, 241, .22)",
      titlebar: "rgba(0,0,0,.55)"
    })
  },
  {
    id: "emerald",
    nameKey: "appThemes.emerald.name",
    descKey: "appThemes.emerald.desc",
    css: preset({
      bg: "#071210",
      surface: "rgba(16, 185, 129, .09)",
      surface2: "rgba(16, 185, 129, .06)",
      surface3: "rgba(16, 185, 129, .12)",
      border: "rgba(16, 185, 129, .22)",
      accent: "rgba(52, 211, 153, .95)",
      accentSoft: "rgba(52, 211, 153, .22)",
      titlebar: "rgba(3, 20, 16, .65)"
    })
  },
  {
    id: "rose",
    nameKey: "appThemes.rose.name",
    descKey: "appThemes.rose.desc",
    css: preset({
      bg: "#12070B",
      surface: "rgba(244, 63, 94, .10)",
      surface2: "rgba(244, 63, 94, .07)",
      surface3: "rgba(244, 63, 94, .12)",
      border: "rgba(244, 63, 94, .22)",
      accent: "rgba(251, 113, 133, .95)",
      accentSoft: "rgba(251, 113, 133, .22)",
      titlebar: "rgba(18, 7, 11, .70)"
    })
  },
  {
    id: "mono",
    nameKey: "appThemes.mono.name",
    descKey: "appThemes.mono.desc",
    css: preset({
      bg: "#0A0A0A",
      surface: "rgba(255,255,255,.06)",
      surface2: "rgba(255,255,255,.05)",
      surface3: "rgba(255,255,255,.08)",
      border: "rgba(255,255,255,.12)",
      accent: "rgba(255,255,255,.90)",
      accentSoft: "rgba(255,255,255,.16)",
      titlebar: "rgba(0,0,0,.45)"
    })
  }
];
