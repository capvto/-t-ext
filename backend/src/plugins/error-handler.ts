import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { HttpError, isHttpError } from '../utils/http';

function mapFastifyError(error: Error): HttpError | null {
  const code = (error as { code?: string }).code;

  if (code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
    return new HttpError(400, 'Invalid JSON body');
  }

  if (code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
    return new HttpError(413, 'Content too large');
  }

  if (code === 'FST_ERR_RATE_LIMIT') {
    return new HttpError(429, 'Too many requests');
  }

  if (code === 'FST_ERR_VALIDATION' || 'validation' in error) {
    return new HttpError(400, 'Invalid request payload');
  }

  return null;
}

async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    const fastifyError = mapFastifyError(error);

    if (fastifyError) {
      reply.code(fastifyError.statusCode).send({ error: fastifyError.message });
      return;
    }

    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid request payload';
      reply.code(400).send({ error: firstIssue });
      return;
    }

    if (isHttpError(error)) {
      reply.code(error.statusCode).send({ error: error.message });
      return;
    }

    request.log.error(
      {
        err: error,
        method: request.method,
        path: request.url,
        requestId: request.id
      },
      'Unhandled application error'
    );

    reply.code(500).send({ error: 'Internal server error' });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: 'Not found' });
  });
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler-plugin'
});
