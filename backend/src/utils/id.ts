import { randomBytes } from 'node:crypto';

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function makeBase62(length: number): string {
  const bytes = randomBytes(length);
  let output = '';

  for (let index = 0; index < length; index += 1) {
    output += BASE62_ALPHABET[bytes[index] % BASE62_ALPHABET.length];
  }

  return output;
}

export function generatePasteId(): string {
  return makeBase62(8);
}

export function generateEditCode(): string {
  return makeBase62(12);
}
