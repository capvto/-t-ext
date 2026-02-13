import type { FastifyInstance } from 'fastify';

import { deleteBodySchema } from '../schemas/paste.schemas';
import type { PasteService } from '../services/paste.service';

type RegisterDeleteRouteInput = {
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

export async function registerDeleteRoute(
  app: FastifyInstance,
  input: RegisterDeleteRouteInput
): Promise<void> {
  app.route({
    method: 'POST',
    url: '/delete',
    config: {
      rateLimit: {
        max: input.mutationRateMax,
        timeWindow: input.rateWindow
      }
    },
    schema: {
      tags: ['pastes'],
      summary: 'Delete a paste by id and edit code',
      body: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          editCode: { type: 'string' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          required: ['ok'],
          properties: {
            ok: { type: 'boolean', enum: [true] }
          }
        },
        400: errorSchema,
        401: errorSchema,
        403: errorSchema,
        404: errorSchema,
        429: errorSchema,
        500: errorSchema
      }
    },
    handler: async (request, reply) => {
      const body = deleteBodySchema.parse(request.body ?? {});
      const result = await input.service.delete({
        id: body.id ?? '',
        editCode: body.editCode ?? ''
      });

      return reply.code(200).send(result);
    }
  });
}
