import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../src/app';
import type { Env } from '../../src/config/env';
import { PasteService } from '../../src/services/paste.service';
import { InMemoryPasteRepository } from './in-memory-repo';

export type TestAppContext = {
  app: FastifyInstance;
  repository: InMemoryPasteRepository;
};

function makeTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://unused',
    PUBLIC_BASE_URL: undefined,
    TRUST_PROXY: false,
    FORWARDED_HOST_ALLOWLIST: [],
    CORS_ORIGINS: ['*'],
    RATE_LIMIT_PUBLISH_MAX: 20,
    RATE_LIMIT_MUTATION_MAX: 60,
    RATE_LIMIT_WINDOW: '1 minute',
    LOG_LEVEL: 'silent',
    NETLIFY_BLOBS_SITE_ID: undefined,
    NETLIFY_BLOBS_TOKEN: undefined,
    NETLIFY_BLOBS_STORE: 't-ext-rentry',
    ...overrides
  };
}

export async function createTestApp(overrides: Partial<Env> = {}): Promise<TestAppContext> {
  const env = makeTestEnv(overrides);
  const repository = new InMemoryPasteRepository();
  const service = new PasteService(repository, env);

  const app = await buildApp({
    env,
    service,
    logger: false
  });

  await app.ready();

  return {
    app,
    repository
  };
}
