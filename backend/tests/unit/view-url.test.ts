import { describe, expect, it } from 'vitest';

import { buildViewUrl } from '../../src/utils/view-url';

describe('buildViewUrl', () => {
  it('prefers PUBLIC_BASE_URL when set', () => {
    const url = buildViewUrl({
      id: 'abc123',
      publicBaseUrl: 'https://example.com',
      trustProxy: true,
      forwardedProto: 'https',
      forwardedHost: 'evil.example.com',
      forwardedHostAllowlist: ['example.com'],
      isProduction: true
    });

    expect(url).toBe('https://example.com/abc123');
  });

  it('uses forwarded headers when trusted proxy is enabled', () => {
    const url = buildViewUrl({
      id: 'abc123',
      trustProxy: true,
      forwardedProto: 'https',
      forwardedHost: 'paste.example.com',
      forwardedHostAllowlist: ['paste.example.com'],
      isProduction: true
    });

    expect(url).toBe('https://paste.example.com/abc123');
  });

  it('falls back to relative path for invalid host', () => {
    const url = buildViewUrl({
      id: 'abc123',
      trustProxy: true,
      forwardedProto: 'https',
      forwardedHost: 'malicious.example.com/path',
      forwardedHostAllowlist: ['paste.example.com'],
      isProduction: true
    });

    expect(url).toBe('/abc123');
  });

  it('falls back to relative path when host is not allowlisted in production', () => {
    const url = buildViewUrl({
      id: 'abc123',
      trustProxy: true,
      forwardedProto: 'https',
      forwardedHost: 'other.example.com',
      forwardedHostAllowlist: ['paste.example.com'],
      isProduction: true
    });

    expect(url).toBe('/abc123');
  });
});
