export type NoteTheme = {
  id: string;
  /** i18n key for the theme display name */
  nameKey: string;
  /** i18n key for the short description */
  descKey: string;
  /** CSS snippet (scoped automatically per note) */
  css: string;
};

// Theme presets are intentionally small, readable CSS snippets.
// They get scoped at runtime to the current note surface.
export const NOTE_THEMES: NoteTheme[] = [
  {
    id: "default",
    nameKey: "themes.default.name",
    descKey: "themes.default.desc",
    css: ""
  },
  {
    id: "paper",
    nameKey: "themes.paper.name",
    descKey: "themes.paper.desc",
    css: `/* Paper — warm, readable */

/* Preview typography */
.prose {
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
  font-size: 16.5px;
  line-height: 1.8;
}

.prose h1, .prose h2, .prose h3 {
  letter-spacing: 0.01em;
}

.prose a {
  color: rgba(251, 191, 36, .95);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.prose blockquote {
  border-left-color: rgba(251, 191, 36, .28);
  background: rgba(251, 191, 36, .06);
  border-radius: 14px;
  padding: 0.6rem 1rem;
}

/* Code blocks */
.codewrap .hljs-pre {
  background: rgba(251, 191, 36, .06);
  border-color: rgba(251, 191, 36, .18);
}

/* Editor highlighting accents */
.md-heading { color: rgba(251, 191, 36, .92); }
.md-code { color: rgba(252, 211, 77, .95); background: rgba(251, 191, 36, .10); }
.md-link-text { color: rgba(251, 191, 36, .92); }
`
  },
  {
    id: "nord",
    nameKey: "themes.nord.name",
    descKey: "themes.nord.desc",
    css: `/* Nord — cool and clean */

.prose {
  font-size: 16px;
  line-height: 1.75;
}

.prose h1, .prose h2, .prose h3 {
  color: rgba(129, 161, 193, .92);
}

.prose a {
  color: rgba(136, 192, 208, .95);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.prose blockquote {
  border-left-color: rgba(136, 192, 208, .28);
  background: rgba(136, 192, 208, .06);
  border-radius: 14px;
  padding: 0.6rem 1rem;
}

.codewrap .hljs-pre {
  background: rgba(129, 161, 193, .06);
  border-color: rgba(136, 192, 208, .18);
}

.md-heading { color: rgba(129, 161, 193, .95); }
.md-code { color: rgba(163, 190, 140, .95); background: rgba(163, 190, 140, .10); }
.md-link-text { color: rgba(136, 192, 208, .95); }
`
  },
  {
    id: "dracula",
    nameKey: "themes.dracula.name",
    descKey: "themes.dracula.desc",
    css: `/* Dracula — vibrant */

.prose a {
  color: rgba(139, 233, 253, .95);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.prose h1, .prose h2, .prose h3 {
  color: rgba(189, 147, 249, .95);
}

.prose blockquote {
  border-left-color: rgba(255, 121, 198, .30);
  background: rgba(255, 121, 198, .07);
  border-radius: 14px;
  padding: 0.6rem 1rem;
}

.codewrap .hljs-pre {
  background: rgba(189, 147, 249, .06);
  border-color: rgba(189, 147, 249, .20);
}

.md-heading { color: rgba(189, 147, 249, .95); }
.md-code { color: rgba(80, 250, 123, .90); background: rgba(80, 250, 123, .10); }
.md-link-text { color: rgba(139, 233, 253, .95); }
`
  },
  {
    id: "typewriter",
    nameKey: "themes.typewriter.name",
    descKey: "themes.typewriter.desc",
    css: `/* Typewriter — mono reading */

.prose {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 15.5px;
  line-height: 1.85;
  letter-spacing: 0.01em;
}

.prose h1, .prose h2, .prose h3 {
  letter-spacing: 0.02em;
}

.prose a { text-decoration-thickness: 1px; text-underline-offset: 3px; }

.codewrap .hljs-pre {
  border-radius: 18px;
}

/* Make markdown symbols a bit quieter in the editor */
.md-sym { opacity: .22; }
`
  },
  {
    id: "high-contrast",
    nameKey: "themes.highContrast.name",
    descKey: "themes.highContrast.desc",
    css: `/* High Contrast — strong separation */

.group {
  background: rgba(255, 255, 255, .07);
  border-color: rgba(255, 255, 255, .14);
}

.prose {
  font-size: 16.5px;
  line-height: 1.8;
}

.prose a { color: rgba(99, 102, 241, .95); }

.prose blockquote {
  border-left-color: rgba(99, 102, 241, .35);
  background: rgba(99, 102, 241, .08);
  border-radius: 14px;
  padding: 0.6rem 1rem;
}

.codewrap .hljs-pre {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.14);
}
`
  }
];
