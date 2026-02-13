import type { FastifyInstance } from 'fastify';

import { pasteQuerySchema } from '../schemas/paste.schemas';
import type { PasteService } from '../services/paste.service';

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' }
  }
};

export async function registerPasteRoute(app: FastifyInstance, service: PasteService): Promise<void> {
  app.route({
    method: 'GET',
    url: '/paste',
    schema: {
      tags: ['pastes'],
      summary: 'Get a markdown note by id',
      querystring: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          required: ['id', 'title', 'content'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        },
        400: errorSchema,
        404: errorSchema,
        500: errorSchema
      }
    },
    handler: async (request, reply) => {
      const query = pasteQuerySchema.parse(request.query ?? {});
      const result = await service.getPaste(query.id ?? '');

      return reply.code(200).send(result);
    }
  });
}
