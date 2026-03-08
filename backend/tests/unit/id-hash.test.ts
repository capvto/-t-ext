import { describe, expect, it } from 'vitest';

import { generateEditCode, generatePasteId } from '../../src/utils/id';
import { sha256Hex, verifySecretAgainstHash } from '../../src/utils/hash';

describe('id and hash utils', () => {
  it('generates base62 paste id with length 8', () => {
    const id = generatePasteId();

    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[0-9a-zA-Z]{8}$/);
  });

  it('generates base62 edit code with length 12', () => {
    const code = generateEditCode();

    expect(code).toHaveLength(12);
    expect(code).toMatch(/^[0-9a-zA-Z]{12}$/);
  });

  it('verifies edit code hash with timing-safe compare', () => {
    const secret = 'AbCdEf123456';
    const hash = sha256Hex(secret);

    expect(verifySecretAgainstHash(hash, secret)).toBe(true);
    expect(verifySecretAgainstHash(hash, 'invalid-code')).toBe(false);
  });
});
