/**
 * Scope a CSS string so it only applies inside a given selector.
 *
 * This is intentionally lightweight (no heavy CSS parser at runtime) but handles:
 * - normal rules: `.a, .b { ... }`
 * - nested at-rules like `@media` / `@supports` / `@container`
 *
 * It does NOT attempt to scope @keyframes or @font-face (left unchanged).
 */
export function scopeCss(inputCss: string, scopeSelector: string): string {
  const css = (inputCss || "").trim();
  if (!css) return "";

  // Remove /* comments */
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

  function isScopableAtRule(header: string) {
    const h = header.trim().toLowerCase();
    return h.startsWith("@media") || h.startsWith("@supports") || h.startsWith("@container") || h.startsWith("@layer");
  }

  function isNonScopableAtRule(header: string) {
    const h = header.trim().toLowerCase();
    return h.startsWith("@keyframes") || h.startsWith("@font-face") || h.startsWith("@property");
  }

  function scopeSelectors(selectorText: string) {
    const raw = selectorText.trim();
    if (!raw) return raw;
    // Split on commas not inside parentheses/brackets.
    const parts: string[] = [];
    let buf = "";
    let paren = 0;
    let bracket = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "(" && bracket === 0) paren++;
      else if (ch === ")" && bracket === 0) paren = Math.max(0, paren - 1);
      else if (ch === "[") bracket++;
      else if (ch === "]") bracket = Math.max(0, bracket - 1);

      if (ch === "," && paren === 0 && bracket === 0) {
        parts.push(buf.trim());
        buf = "";
      } else {
        buf += ch;
      }
    }
    if (buf.trim()) parts.push(buf.trim());

    function mapRootSelector(sel: string) {
      const s = sel.trim();
      // Map global-ish selectors to the scope root so users can write :root/html/body
      // to set variables for the scoped surface.
      if (s === ":root" || s === "html" || s === "body" || s === ":host") return scopeSelector;
      // Common patterns like ":root.dark" should become "<scope>.dark".
      if (s.startsWith(":root")) return (scopeSelector + s.slice(5)).trim();
      if (s.startsWith("html")) return (scopeSelector + s.slice(4)).trim();
      if (s.startsWith("body")) return (scopeSelector + s.slice(4)).trim();
      return "";
    }

    return parts
      .map((sel) => {
        const rootMapped = mapRootSelector(sel);
        if (rootMapped) return rootMapped;

        // Avoid double-scoping if the user already scoped explicitly.
        if (sel.startsWith(scopeSelector)) return sel;

        return `${scopeSelector} ${sel}`.trim();
      })
      .join(", ");
  }

  // Simple block parser: walks the CSS and rebuilds with scoped selectors.
  function parseBlocks(source: string): string {
    let out = "";
    let i = 0;

    while (i < source.length) {
      // Skip whitespace
      if (/\s/.test(source[i])) {
        out += source[i++];
        continue;
      }

      // Find next '{'
      const brace = source.indexOf("{", i);
      if (brace === -1) {
        out += source.slice(i);
        break;
      }

      const header = source.slice(i, brace).trim();

      // Find matching '}'
      let depth = 0;
      let j = brace;
      for (; j < source.length; j++) {
        const ch = source[j];
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            j++; // include '}'
            break;
          }
        }
      }

      const bodyWithBraces = source.slice(brace, j);
      const body = bodyWithBraces.slice(1, -1);

      if (header.startsWith("@")) {
        if (isNonScopableAtRule(header)) {
          out += `${header}{${body}}`;
        } else if (isScopableAtRule(header)) {
          out += `${header}{${parseBlocks(body)}}`;
        } else {
          // Unknown at-rule. Preserve as-is.
          out += `${header}{${body}}`;
        }
      } else {
        const scoped = scopeSelectors(header);
        out += `${scoped}{${body}}`;
      }

      i = j;
    }

    return out;
  }

  return parseBlocks(noComments);
}
