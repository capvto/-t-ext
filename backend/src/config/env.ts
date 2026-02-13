import { z } from 'zod';

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;

  if (typeof value !== 'string') return fallback;

  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;

  return fallback;
}

function parseCsv(value: unknown): string[] {
  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  PUBLIC_BASE_URL: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      try {
        // Validate once at bootstrap to avoid runtime URL parsing failures later.
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, {
      message: 'PUBLIC_BASE_URL must be a valid URL'
    }),
  TRUST_PROXY: z.any().optional(),
  FORWARDED_HOST_ALLOWLIST: z.any().optional(),
  CORS_ORIGINS: z.any().optional(),
  RATE_LIMIT_PUBLISH_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_MUTATION_MAX: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NETLIFY_BLOBS_SITE_ID: z.string().optional(),
  NETLIFY_BLOBS_TOKEN: z.string().optional(),
  NETLIFY_BLOBS_STORE: z.string().default('t-ext-rentry')
});

export type Env = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  PUBLIC_BASE_URL?: string;
  TRUST_PROXY: boolean;
  FORWARDED_HOST_ALLOWLIST: string[];
  CORS_ORIGINS: string[];
  RATE_LIMIT_PUBLISH_MAX: number;
  RATE_LIMIT_MUTATION_MAX: number;
  RATE_LIMIT_WINDOW: string;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  NETLIFY_BLOBS_SITE_ID?: string;
  NETLIFY_BLOBS_TOKEN?: string;
  NETLIFY_BLOBS_STORE: string;
};

export function loadEnv(rawEnv: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.parse(rawEnv);

  return {
    ...parsed,
    TRUST_PROXY: parseBoolean(parsed.TRUST_PROXY, false),
    FORWARDED_HOST_ALLOWLIST: parseCsv(parsed.FORWARDED_HOST_ALLOWLIST).map((entry) =>
      entry.toLowerCase()
    ),
    CORS_ORIGINS: parseCsv(parsed.CORS_ORIGINS)
  };
}
