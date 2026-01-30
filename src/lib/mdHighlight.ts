// Lightweight, dependency-free markdown "syntax highlighting" for the editor.
//
// This is intentionally NOT a full Markdown parser.
// It highlights a few common constructs so users can "see" markdown effects
// while typing in a plain textarea.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Slot = { key: string; html: string };

function withSlots(input: string, regex: RegExp, render: (m: RegExpExecArray) => string) {
  const slots: Slot[] = [];
  const out = input.replace(regex, (...args) => {
    // The last two args are offset and full string.
    const match = args[0] as string;
    const offset = args[args.length - 2] as number;
    const full = args[args.length - 1] as string;
    // Recreate the exec array so render can access capture groups.
    const re = new RegExp(regex.source, regex.flags);
    re.lastIndex = 0;
    const exec = re.exec(match);
    const arr = (exec ?? [match]) as unknown as RegExpExecArray;
    (arr as any).index = offset;
    (arr as any).input = full;
    const key = `\u0000SLOT_${slots.length}\u0000`;
    slots.push({ key, html: render(arr) });
    return key;
  });
  return { out, slots };
}

function restoreSlots(input: string, slots: Slot[]) {
  let out = input;
  for (const s of slots) out = out.split(s.key).join(s.html);
  return out;
}

function highlightInline(escaped: string): string {
  // Mask code spans first so we don't highlight inside them.
  const codeSlots = withSlots(escaped, /`[^`]*`/g, (m) => {
    const raw = m[0];
    const inner = raw.slice(1, -1);
    return `<span class="md-sym">&#96;</span><span class="md-code">${inner || ""}</span><span class="md-sym">&#96;</span>`;
  });

  // Mask links: [text](url)
  const linkSlots = withSlots(codeSlots.out, /\[([^\]]+)\]\(([^)]+)\)/g, (m) => {
    const text = m[1] ?? "";
    const url = m[2] ?? "";
    return `<span class="md-sym">[</span><span class="md-link-text">${text}</span><span class="md-sym">]</span><span class="md-sym">(</span><span class="md-link-url">${url}</span><span class="md-sym">)</span>`;
  });

  let out = linkSlots.out;

  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, g1) => {
    return `<span class="md-sym">**</span><span class="md-bold">${g1}</span><span class="md-sym">**</span>`;
  });

  // Italic underscore: _text_ (avoid matching within words)
  out = out.replace(/(^|[^\w])_([^_]+)_([^\w]|$)/g, (_m, pre, g1, post) => {
    return `${pre}<span class="md-sym">_</span><span class="md-italic">${g1}</span><span class="md-sym">_</span>${post}`;
  });

  // Italic asterisk: *text* (avoid matching within words)
  out = out.replace(/(^|[^\w])\*([^*]+)\*([^\w]|$)/g, (_m, pre, g1, post) => {
    return `${pre}<span class="md-sym">*</span><span class="md-italic">${g1}</span><span class="md-sym">*</span>${post}`;
  });

  // Strikethrough: ~~text~~
  out = out.replace(/~~([^~]+)~~/g, (_m, g1) => {
    return `<span class="md-sym">~~</span><span class="md-strike">${g1}</span><span class="md-sym">~~</span>`;
  });

  // Restore masked parts (links inside code are already masked by code first).
  out = restoreSlots(out, linkSlots.slots);
  out = restoreSlots(out, codeSlots.slots);
  return out;
}

export function highlightMarkdown(input: string): string {
  const lines = input.split("\n");
  let inFence = false;
  const out: string[] = [];

  for (const rawLine of lines) {
    // Code fence toggle
    const fenceMatch = rawLine.match(/^(\s*)```\s*(.*)$/);
    if (fenceMatch) {
      const indent = fenceMatch[1] ?? "";
      const lang = fenceMatch[2] ?? "";
      inFence = !inFence;
      out.push(
        `${escapeHtml(indent)}<span class="md-fence">\`\`\`</span>${lang ? ` <span class="md-fence-lang">${escapeHtml(lang)}</span>` : ""}`
      );
      continue;
    }

    if (inFence) {
      out.push(`<span class="md-codeblock">${escapeHtml(rawLine)}</span>`);
      continue;
    }

    // Headings: # ...
    const hMatch = rawLine.match(/^(\s*)(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const indent = hMatch[1] ?? "";
      const hashes = hMatch[2] ?? "";
      const rest = hMatch[3] ?? "";
      out.push(
        `${escapeHtml(indent)}<span class="md-sym">${escapeHtml(hashes)}</span> <span class="md-heading">${highlightInline(
          escapeHtml(rest)
        )}</span>`
      );
      continue;
    }

    // Blockquote: > ...
    const qMatch = rawLine.match(/^(\s*)>\s?(.*)$/);
    if (qMatch) {
      const indent = qMatch[1] ?? "";
      const rest = qMatch[2] ?? "";
      out.push(
        `${escapeHtml(indent)}<span class="md-sym">&gt;</span> <span class="md-quote">${highlightInline(
          escapeHtml(rest)
        )}</span>`
      );
      continue;
    }

    // Lists: -, *, +, 1.
    const lMatch = rawLine.match(/^(\s*)((?:[-+*])|(?:\d+\.))\s+(.*)$/);
    if (lMatch) {
      const indent = lMatch[1] ?? "";
      const marker = lMatch[2] ?? "";
      const rest = lMatch[3] ?? "";
      out.push(
        `${escapeHtml(indent)}<span class="md-sym">${escapeHtml(marker)}</span> <span class="md-list">${highlightInline(
          escapeHtml(rest)
        )}</span>`
      );
      continue;
    }

    out.push(highlightInline(escapeHtml(rawLine)));
  }

  return out.join("\n");
}
