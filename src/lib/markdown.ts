import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/common";
import type { MarkdownPluginSpec } from "./types";

type PluginSanitize = {
  addTags?: string[];
  addAttrs?: string[];
};

export type MarkdownPluginRuntime = {
  name?: string;
  css?: string;
  /**
   * Preprocessor that runs BEFORE markdown-it parsing. Should return Markdown.
   * Useful for simple custom syntaxes (e.g. !ciao!, -> Ciao ->).
   */
  transform?: (markdown: string, api: PluginAPI) => string;
  /**
   * Advanced: register markdown-it rules directly.
   *
   * Example:
   *   use(md) { md.inline.ruler.before('emphasis', 'my', ... ) }
   */
  use?: (md: MarkdownIt, api: PluginAPI) => void;
  /** Optional: ask DOMPurify to keep extra tags/attrs. */
  sanitize?: PluginSanitize;
};

export type MarkdownRenderer = {
  render: (markdown: string) => string;
  css: string;
  errors: Record<string, string>;
};

export type PluginAPI = {
  escapeHtml: (s: string) => string;
  inline: (text: string, className: string, tag?: string) => string;
  block: (text: string, className: string, tag?: string) => string;
};

function safeLangClass(lang: string) {
  // Keep only characters that are safe for class names / data attributes.
  return (lang || "").trim().toLowerCase().replace(/[^\w-]/g, "");
}

function highlight(code: string, langRaw: string, md: MarkdownIt) {
  const lang = safeLangClass(langRaw);
  try {
    if (lang && hljs.getLanguage(lang)) {
      return { html: hljs.highlight(code, { language: lang, ignoreIllegals: true }).value, lang };
    }
    return { html: hljs.highlightAuto(code).value, lang: lang || "" };
  } catch {
    // Fallback: safe text
    return { html: md.utils.escapeHtml(code), lang: lang || "" };
  }
}

function createBaseMarkdownIt() {
  const md = new MarkdownIt({
    // Allow a tiny subset of HTML for formatting (e.g. <u>…</u> used by Cmd/Ctrl+U).
    // Output is still sanitized by DOMPurify below.
    html: true,
    linkify: true,
    typographer: true,
    breaks: false
  });

  // Render fenced code blocks with syntax highlighting and a wrapper we can enhance
  // (e.g. add a copy button) after sanitization.
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const info = (token.info || "").trim();
    const langRaw = info.split(/\s+/g)[0] || "";
    const { html, lang } = highlight(token.content, langRaw, md);

    const langClass = lang ? `language-${lang}` : "";

    return (
      `<div class="codewrap not-prose relative my-4" data-codewrap data-lang="${md.utils.escapeHtml(lang)}">` +
      `<pre class="hljs-pre overflow-x-auto rounded-xl border border-white/10 bg-white/7 p-3 font-mono text-[13px] leading-relaxed">` +
      `<code class="hljs ${langClass}" data-lang="${md.utils.escapeHtml(lang)}">${html}</code>` +
      `</pre>` +
      `</div>`
    );
  };

  // Render indented code blocks too.
  md.renderer.rules.code_block = (tokens, idx) => {
    const token = tokens[idx];
    const { html } = highlight(token.content, "", md);

    return (
      `<div class="codewrap not-prose relative my-4" data-codewrap data-lang="">` +
      `<pre class="hljs-pre overflow-x-auto rounded-xl border border-white/10 bg-white/7 p-3 font-mono text-[13px] leading-relaxed">` +
      `<code class="hljs" data-lang="">${html}</code>` +
      `</pre>` +
      `</div>`
    );
  };

  return md;
}

function buildApi(md: MarkdownIt): PluginAPI {
  const escapeHtml = (s: string) => md.utils.escapeHtml(String(s ?? ""));
  const inline = (text: string, className: string, tag = "span") => {
    const t = String(tag || "span").replace(/[^a-z0-9-]/gi, "") || "span";
    const cls = String(className || "").replace(/[^\w\s-]/g, "").trim();
    return `<${t} class="${escapeHtml(cls)}">${escapeHtml(text)}</${t}>`;
  };
  const block = (text: string, className: string, tag = "div") => {
    const t = String(tag || "div").replace(/[^a-z0-9-]/gi, "") || "div";
    const cls = String(className || "").replace(/[^\w\s-]/g, "").trim();
    // Surround with newlines so markdown-it treats it as a block HTML element.
    return `\n<${t} class="${escapeHtml(cls)}">${escapeHtml(text)}</${t}>\n`;
  };
  return { escapeHtml, inline, block };
}

function evaluatePlugin(code: string, api: PluginAPI): MarkdownPluginRuntime {
  const src = String(code || "").trim();
  if (!src) throw new Error("Empty plugin code");

  // The user script is expected to end with `return { ... }`.
  // We only pass a minimal API object.
  // NOTE: This runs local, user-authored code. Treat plugins as trusted.
  const fn = new Function("api", `"use strict";\n${src}\n`);
  const out = fn(api);
  if (!out || typeof out !== "object") {
    throw new Error("Plugin must return an object");
  }
  return out as MarkdownPluginRuntime;
}

export function createMarkdownRenderer(specs: MarkdownPluginSpec[] = []): MarkdownRenderer {
  const md = createBaseMarkdownIt();
  const api = buildApi(md);
  const errors: Record<string, string> = {};

  const transforms: Array<(s: string) => string> = [];
  const cssParts: string[] = [];
  const extraTags: Set<string> = new Set();
  const extraAttrs: Set<string> = new Set();

  for (const spec of specs || []) {
    if (!spec?.enabled) continue;
    try {
      const plugin = evaluatePlugin(spec.code, api);
      if (plugin?.css) cssParts.push(String(plugin.css));

      if (plugin?.sanitize?.addTags) {
        plugin.sanitize.addTags.forEach(t => extraTags.add(String(t)));
      }
      if (plugin?.sanitize?.addAttrs) {
        plugin.sanitize.addAttrs.forEach(a => extraAttrs.add(String(a)));
      }

      if (typeof plugin?.use === "function") {
        try {
          plugin.use(md, api);
        } catch (e: any) {
          throw new Error(`use() failed: ${String(e?.message || e)}`);
        }
      }
      if (typeof plugin?.transform === "function") {
        transforms.push((s: string) => plugin.transform!(s, api));
      }
    } catch (e: any) {
      const id = spec?.id || "plugin";
      errors[id] = String(e?.message || e);
    }
  }

  const css = cssParts.join("\n\n");

  const render = (markdown: string) => {
    let input = String(markdown ?? "");
    for (const t of transforms) {
      try {
        input = t(input);
      } catch {
        // If a transform fails at runtime, skip it (do not crash rendering)
      }
    }

    const raw = md.render(input);
    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      // Make sure our wrappers and classes survive sanitization.
      ADD_ATTR: ["class", "data-lang", "data-codewrap", ...Array.from(extraAttrs)],
      ADD_TAGS: Array.from(extraTags)
    });
  };

  return { render, css, errors };
}

// Backwards-compatible helper (no plugins)
export function renderMarkdown(markdown: string): string {
  return createMarkdownRenderer().render(markdown);
}
