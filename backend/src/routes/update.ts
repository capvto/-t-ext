import type { FastifyInstance } from 'fastify';

import { updateBodySchema } from '../schemas/paste.schemas';
import type { PasteService } from '../services/paste.service';

type RegisterUpdateRouteInput = {
  service: PasteService;
  mutationRateMax: number;
  rateWindow: string;
};

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' }
  }
};

export async function registerUpdateRoute(
  app: FastifyInstance,
  input: RegisterUpdateRouteInput
): Promise<void> {
  app.route({
    method: 'POST',
    url: '/update',
    config: {
      rateLimit: {
        max: input.mutationRateMax,
        timeWindow: input.rateWindow
      }
    },
    schema: {
      tags: ['pastes'],
      summary: 'Update paste content',
      body: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          editCode: { type: 'string' },
          content: { type: 'string' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          required: ['ok'],
          properties: {
            ok: { type: 'boolean', enum: [true] },
            updatedAt: { type: 'string' }
          }
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        413: errorSchema,
        429: errorSchema,
        500: errorSchema
      }
    },
    handler: async (request, reply) => {
      const body = updateBodySchema.parse(request.body ?? {});
      const result = await input.service.update({
        id: body.id ?? '',
        editCode: body.editCode ?? '',
        content: body.content ?? ''
      });

      return reply.code(200).send(result);
    }
  });
}
