import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

const md = new MarkdownIt({
  // Allow a tiny subset of HTML for formatting (e.g. <u>…</u> used by Cmd/Ctrl+U).
  // Output is still sanitized by DOMPurify below.
  html: true,
  linkify: true,
  typographer: true,
  breaks: false
});

export function renderMarkdown(markdown: string): string {
  const raw = md.render(markdown);
  // extra safety: sanitize anyway (allows only safe tags/attrs)
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
