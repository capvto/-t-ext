import type { FastifyInstance } from 'fastify';

import { publishBodySchema } from '../schemas/paste.schemas';
import type { PasteService } from '../services/paste.service';

type RegisterPublishRouteInput = {
  service: PasteService;
  publishRateMax: number;
  rateWindow: string;
};

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string' }
  }
};

export async function registerPublishRoute(
  app: FastifyInstance,
  input: RegisterPublishRouteInput
): Promise<void> {
  app.route({
    method: 'POST',
    url: '/publish',
    config: {
      rateLimit: {
        max: input.publishRateMax,
        timeWindow: input.rateWindow
      }
    },
    schema: {
      tags: ['pastes'],
      summary: 'Publish a new markdown note',
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          slug: { type: 'string' }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          required: ['id', 'editCode', 'viewUrl'],
          properties: {
            id: { type: 'string' },
            editCode: { type: 'string' },
            viewUrl: { type: 'string' }
          }
        },
        400: errorSchema,
        409: errorSchema,
        413: errorSchema,
        429: errorSchema,
        500: errorSchema
      }
    },
    handler: async (request, reply) => {
      const body = publishBodySchema.parse(request.body ?? {});
      const result = await input.service.publish(
        {
          title: body.title,
          content: body.content ?? '',
          slug: body.slug
        },
        {
          forwardedProto: request.headers['x-forwarded-proto'],
          forwardedHost: request.headers['x-forwarded-host']
        }
      );

      return reply.code(200).send(result);
    }
  });
}
