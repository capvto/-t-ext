import { describe, expect, it } from 'vitest';

import { normalizeSlug, validateNormalizedSlug } from '../../src/utils/slug';

describe('slug utils', () => {
  it('normalizes slug with spaces and punctuation', () => {
    const normalized = normalizeSlug('  My Slug!!!  ');
    expect(normalized).toBe('my-slug');
  });

  it('rejects reserved slugs', () => {
    const result = validateNormalizedSlug('api');
    expect(result.ok).toBe(false);
  });

  it('rejects normalized reserved route aliases', () => {
    const normalized = normalizeSlug('favicon.ico');
    expect(normalized).toBe('favicon-ico');
    expect(validateNormalizedSlug(normalized).ok).toBe(false);
  });

  it('rejects too short slugs', () => {
    const result = validateNormalizedSlug('a');
    expect(result.ok).toBe(false);
  });

  it('rejects too long slugs', () => {
    const result = validateNormalizedSlug('a'.repeat(65));
    expect(result.ok).toBe(false);
  });

  it('rejects invalid utf8-normalized result', () => {
    const normalized = normalizeSlug('🔥🔥🔥');
    expect(normalized).toBe('');
    const result = validateNormalizedSlug(normalized);
    expect(result.ok).toBe(false);
  });

  it('accepts valid slug', () => {
    const result = validateNormalizedSlug('my-note_123');
    expect(result.ok).toBe(true);
  });
});
