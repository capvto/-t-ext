import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Array<string | undefined | null | false>) {
  return twMerge(clsx(inputs));
}

/**
 * Small, dependency-free UID generator (uses crypto when available).
 */
export function uid(): string {
  // NOTE: we use globalThis.crypto (typed as unknown) to avoid TS env/type conflicts
  // between DOM/WebCrypto and Node/Electron builds.
  type CryptoLike = {
    randomUUID?: () => string;
    getRandomValues?: (arr: Uint8Array) => Uint8Array;
  };

  const c = (globalThis as unknown as { crypto?: CryptoLike }).crypto;

  if (c?.randomUUID) return c.randomUUID();

  const buf = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(buf);
  else for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  // hex
  return Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
