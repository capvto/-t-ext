import { createHash, timingSafeEqual } from 'node:crypto';

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function verifySecretAgainstHash(expectedHex: string, providedSecret: string): boolean {
  if (!SHA256_HEX_RE.test(expectedHex)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  const providedBuffer = createHash('sha256').update(providedSecret).digest();

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
