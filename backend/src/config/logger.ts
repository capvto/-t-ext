import type { FastifyServerOptions } from 'fastify';

import type { Env } from './env';

export function createLoggerConfig(env: Env): FastifyServerOptions['logger'] {
  if (env.NODE_ENV === 'test') {
    return false;
  }

  if (env.NODE_ENV === 'development') {
    return {
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          singleLine: true
        }
      }
    };
  }

  return {
    level: env.LOG_LEVEL
  };
}
