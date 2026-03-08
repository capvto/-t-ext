type HeaderValue = string | string[] | undefined;

type BuildViewUrlInput = {
  id: string;
  publicBaseUrl?: string;
  trustProxy: boolean;
  forwardedProto: HeaderValue;
  forwardedHost: HeaderValue;
  forwardedHostAllowlist: string[];
  isProduction: boolean;
};

const HOST_RE = /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9-]+\.)*[a-z0-9-]+)(:\d{1,5})?$/i;
const IPV6_RE = /^\[[0-9a-f:.]+\](:\d{1,5})?$/i;

function firstHeaderValue(value: HeaderValue): string {
  const raw = Array.isArray(value) ? value[0] ?? '' : String(value ?? '');

  return raw.split(',')[0]?.trim() ?? '';
}

function ensureBaseUrl(baseUrl: string): string | null {
  try {
    const parsed = new URL(baseUrl);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function isValidHost(host: string): boolean {
  if (!host) return false;
  if (host.includes('/') || host.includes('\\') || host.includes('@')) return false;
  if (/[\s\r\n]/.test(host)) return false;

  return HOST_RE.test(host) || IPV6_RE.test(host);
}

export function buildViewUrl(input: BuildViewUrlInput): string {
  const encodedId = encodeURIComponent(input.id);

  if (input.publicBaseUrl) {
    const base = ensureBaseUrl(input.publicBaseUrl);
    if (base) {
      return new URL(encodedId, `${base}/`).toString();
    }
  }

  if (input.trustProxy) {
    const proto = firstHeaderValue(input.forwardedProto).toLowerCase();
    const host = firstHeaderValue(input.forwardedHost).toLowerCase();

    if ((proto === 'http' || proto === 'https') && isValidHost(host)) {
      if (input.isProduction && input.forwardedHostAllowlist.length > 0) {
        const allowed = input.forwardedHostAllowlist.map((entry) => entry.toLowerCase());

        if (!allowed.includes(host)) {
          return `/${encodedId}`;
        }
      }

      return `${proto}://${host}/${encodedId}`;
    }
  }

  return `/${encodedId}`;
}
