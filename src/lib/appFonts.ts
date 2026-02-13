export type AppFont = {
  id: string;
  /** i18n key for the font display name */
  nameKey: string;
  /** i18n key for the short description */
  descKey: string;
  /** CSS font-family value */
  family: string;
};

// Global font presets.
// NOTE: We intentionally use safe font stacks (no remote loading) so the app
// stays offline-first and lightweight. If a font isn't installed, the browser
// will fall back to the next in the stack.

export const APP_FONTS: AppFont[] = [
  {
    id: "default",
    nameKey: "appFonts.default.name",
    descKey: "appFonts.default.desc",
    // empty means: keep Tailwind's default font stack
    family: ""
  },
  {
    id: "system",
    nameKey: "appFonts.system.name",
    descKey: "appFonts.system.desc",
    family:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
  },
  {
    id: "inter",
    nameKey: "appFonts.inter.name",
    descKey: "appFonts.inter.desc",
    family:
      'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial'
  },
  {
    id: "sf",
    nameKey: "appFonts.sf.name",
    descKey: "appFonts.sf.desc",
    family:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", Inter, Roboto, Helvetica, Arial'
  },
  {
    id: "plex",
    nameKey: "appFonts.plex.name",
    descKey: "appFonts.plex.desc",
    family:
      '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto, Helvetica, Arial'
  },
  {
    id: "grotesk",
    nameKey: "appFonts.grotesk.name",
    descKey: "appFonts.grotesk.desc",
    family:
      '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto, Helvetica, Arial'
  },
  {
    id: "source",
    nameKey: "appFonts.source.name",
    descKey: "appFonts.source.desc",
    family:
      '"Source Sans 3", "Source Sans Pro", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto, Helvetica, Arial'
  },
  {
    id: "serif",
    nameKey: "appFonts.serif.name",
    descKey: "appFonts.serif.desc",
    family: 'ui-serif, Georgia, "Times New Roman", Times, serif'
  }
];

export const APP_MONO_FONTS: AppFont[] = [
  {
    id: "default",
    nameKey: "appMonoFonts.default.name",
    descKey: "appMonoFonts.default.desc",
    family: ""
  },
  {
    id: "system-mono",
    nameKey: "appMonoFonts.system.name",
    descKey: "appMonoFonts.system.desc",
    family:
      'ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },
  {
    id: "jetbrains",
    nameKey: "appMonoFonts.jetbrains.name",
    descKey: "appMonoFonts.jetbrains.desc",
    family:
      '"JetBrains Mono", ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },
  {
    id: "fira",
    nameKey: "appMonoFonts.fira.name",
    descKey: "appMonoFonts.fira.desc",
    family:
      '"Fira Code", ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },
  {
    id: "ibm-plex-mono",
    nameKey: "appMonoFonts.plex.name",
    descKey: "appMonoFonts.plex.desc",
    family:
      '"IBM Plex Mono", ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  }
];
