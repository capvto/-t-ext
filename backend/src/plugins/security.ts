import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

import type { Env } from '../config/env';

type SecurityPluginOptions = {
  env: Env;
};

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*')) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

async function securityPlugin(app: FastifyInstance, options: SecurityPluginOptions): Promise<void> {
  const { env } = options;

  await app.register(helmet);

  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.NODE_ENV !== 'production' && env.CORS_ORIGINS.length === 0) {
        callback(null, true);
        return;
      }

      callback(null, isOriginAllowed(origin, env.CORS_ORIGINS));
    }
  });

  await app.register(rateLimit, {
    global: false,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      error: 'Too many requests'
    })
  });
}

export default fp(securityPlugin, {
  name: 'security-plugin'
});
