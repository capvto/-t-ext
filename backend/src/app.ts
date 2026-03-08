import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import type { Env } from './config/env';
import { registerDeleteRoute } from './routes/delete';
import { registerPasteRoute } from './routes/paste';
import { registerPublishRoute } from './routes/publish';
import { registerUpdateRoute } from './routes/update';
import { type PasteService } from './services/paste.service';
import { BODY_LIMIT_BYTES } from './utils/http';
import errorHandlerPlugin from './plugins/error-handler';
import openApiPlugin from './plugins/openapi';
import securityPlugin from './plugins/security';

type BuildAppInput = {
  env: Env;
  service: PasteService;
  logger: FastifyServerOptions['logger'];
};

export async function buildApp(input: BuildAppInput): Promise<FastifyInstance> {
  const app = Fastify({
    logger: input.logger,
    trustProxy: input.env.TRUST_PROXY,
    bodyLimit: BODY_LIMIT_BYTES,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => randomUUID()
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('cache-control', 'no-store');
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        requestId: request.id,
        remoteIp: request.ip
      },
      'Request completed'
    );
  });

  await app.register(securityPlugin, { env: input.env });
  await app.register(openApiPlugin);
  await app.register(errorHandlerPlugin);

  app.get('/healthz', {
    schema: {
      tags: ['pastes'],
      summary: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          required: ['ok'],
          properties: {
            ok: { type: 'boolean', enum: [true] }
          }
        }
      }
    },
    handler: async (_request, reply) => reply.code(200).send({ ok: true })
  });

  await registerPublishRoute(app, {
    service: input.service,
    publishRateMax: input.env.RATE_LIMIT_PUBLISH_MAX,
    rateWindow: input.env.RATE_LIMIT_WINDOW
  });
  await registerPasteRoute(app, input.service);
  await registerUpdateRoute(app, {
    service: input.service,
    mutationRateMax: input.env.RATE_LIMIT_MUTATION_MAX,
    rateWindow: input.env.RATE_LIMIT_WINDOW
  });
  await registerDeleteRoute(app, {
    service: input.service,
    mutationRateMax: input.env.RATE_LIMIT_MUTATION_MAX,
    rateWindow: input.env.RATE_LIMIT_WINDOW
  });

  return app;
}
