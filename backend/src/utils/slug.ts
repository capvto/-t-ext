export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 64;

export const RESERVED_SLUGS = new Set([
  'p',
  'edit',
  'assets',
  'api',
  'favicon-ico',
  'favicon.ico',
  'robots-txt',
  'robots.txt',
  'sitemap-xml',
  'sitemap.xml',
  'index-html',
  'index.html',
  'healthz'
]);

const SLUG_RE = /^[a-z0-9][a-z0-9-_]*[a-z0-9]$/;

export function normalizeSlug(raw: string): string {
  let slug = String(raw).trim().toLowerCase();

  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/[^a-z0-9-_]+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^[-_]+|[-_]+$/g, '');

  return slug;
}

export function validateNormalizedSlug(slug: string): { ok: true } | { ok: false; error: string } {
  if (!slug) {
    return { ok: false, error: 'Invalid slug' };
  }

  if (slug.startsWith('.')) {
    return { ok: false, error: 'Slug not allowed' };
  }

  if (slug.length < SLUG_MIN_LENGTH) {
    return { ok: false, error: `Slug too short (min ${SLUG_MIN_LENGTH})` };
  }

  if (slug.length > SLUG_MAX_LENGTH) {
    return { ok: false, error: `Slug too long (max ${SLUG_MAX_LENGTH})` };
  }

  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: 'Invalid slug' };
  }

  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: 'Slug not allowed' };
  }

  return { ok: true };
}
