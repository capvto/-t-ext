import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

async function openApiPlugin(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Markdown Publish API',
        version: '1.0.0',
        description: 'API for publishing, reading, updating and deleting markdown notes'
      },
      servers: [{ url: '/' }],
      tags: [{ name: 'pastes', description: 'Markdown paste operations' }]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
}

export default fp(openApiPlugin, {
  name: 'openapi-plugin'
});
