import { PrismaClient } from '@prisma/client';

import { buildApp } from './app';
import { loadEnv } from './config/env';
import { createLoggerConfig } from './config/logger';
import { PrismaPasteRepository } from './repositories/paste.repository';
import { PasteService } from './services/paste.service';

async function main(): Promise<void> {
  const env = loadEnv();
  const prisma = new PrismaClient();
  const repository = new PrismaPasteRepository(prisma);
  const service = new PasteService(repository, env);

  const app = await buildApp({
    env,
    service,
    logger: createLoggerConfig(env)
  });

  const closeSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

  for (const signal of closeSignals) {
    process.on(signal, async () => {
      app.log.info({ signal }, 'Shutdown signal received');
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  try {
    await app.listen({
      host: '0.0.0.0',
      port: env.PORT
    });

    app.log.info({ port: env.PORT }, 'Backend listening');
  } catch (error) {
    app.log.error({ err: error }, 'Unable to start backend');
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
