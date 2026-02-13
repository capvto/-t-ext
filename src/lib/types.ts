export type Doc = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  /** If this doc was imported from a public link (rentry-like), store the source URL. */
  importedFrom?: string;
  /** ISO timestamp of import (optional). */
  importedAt?: string;
  /** Optional per-note custom CSS (scoped to the note surface). */
  customCss?: string;
  /** Optional per-note Markdown extension plugins (JavaScript). */
  markdownPlugins?: MarkdownPluginSpec[];
};

export type MarkdownPluginSpec = {
  id: string;
  /** Display name in the UI */
  name: string;
  /** Whether the plugin is active for this note */
  enabled: boolean;
  /** JavaScript source. Must `return { ... }` */
  code: string;
};
