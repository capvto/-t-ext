export const MAX_CONTENT_LENGTH = 200_000;
export const MAX_TITLE_LENGTH = 120;
export const BODY_LIMIT_BYTES = 220 * 1024;

export class HttpError extends Error {
  public readonly statusCode: number;

  public constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError;
}
