import { PrismaClient } from '@prisma/client';
import { getStore } from '@netlify/blobs';
import { z } from 'zod';

const pasteSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional().default(''),
  content: z.string(),
  editHash: z.string().regex(/^[a-f0-9]{64}$/i),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

type BlobItem = {
  key: string;
};

type ListResponse = {
  blobs?: BlobItem[];
  cursor?: string;
};

function parseArgs(argv: string[]): { apply: boolean } {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run');

  if (apply && dryRun) {
    throw new Error('Use either --apply or --dry-run, not both');
  }

  return { apply };
}

function ensureEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }

  return value;
}

function isPasteKey(key: string): boolean {
  return key.startsWith('pastes/');
}

async function main(): Promise<void> {
  const { apply } = parseArgs(process.argv.slice(2));

  const databaseUrl = ensureEnv('DATABASE_URL');
  const siteID = ensureEnv('NETLIFY_BLOBS_SITE_ID');
  const token = ensureEnv('NETLIFY_BLOBS_TOKEN');
  const storeName = process.env.NETLIFY_BLOBS_STORE || 't-ext-rentry';

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  const store = getStore({
    name: storeName,
    siteID,
    token
  }) as any;

  const report = {
    apply,
    totalKeys: 0,
    pasteKeys: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    corrupted: 0,
    collisions: 0,
    errors: 0
  };

  console.log(`Starting Netlify Blobs import (mode: ${apply ? 'apply' : 'dry-run'})`);

  let cursor: string | undefined;

  try {
    do {
      const page: ListResponse = await store.list({ cursor });
      const blobs = Array.isArray(page.blobs) ? page.blobs : [];
      report.totalKeys += blobs.length;

      for (const blob of blobs) {
        if (!blob?.key || !isPasteKey(blob.key)) {
          continue;
        }

        report.pasteKeys += 1;

        let parsed: z.infer<typeof pasteSchema>;

        try {
          const raw = await store.get(blob.key);

          if (!raw) {
            report.skipped += 1;
            continue;
          }

          const json = JSON.parse(String(raw));
          parsed = pasteSchema.parse(json);
        } catch {
          report.corrupted += 1;
          continue;
        }

        const createdAt = parsed.createdAt ? new Date(parsed.createdAt) : new Date();
        const updatedAt = parsed.updatedAt ? new Date(parsed.updatedAt) : createdAt;

        if (!apply) {
          report.imported += 1;
          continue;
        }

        const existing = await prisma.paste.findUnique({ where: { id: parsed.id } });

        if (existing) {
          report.collisions += 1;
        }

        await prisma.paste.upsert({
          where: { id: parsed.id },
          update: {
            title: parsed.title.slice(0, 120),
            content: parsed.content,
            editHash: parsed.editHash,
            createdAt,
            updatedAt
          },
          create: {
            id: parsed.id,
            title: parsed.title.slice(0, 120),
            content: parsed.content,
            editHash: parsed.editHash,
            createdAt,
            updatedAt
          }
        });

        if (existing) {
          report.updated += 1;
        } else {
          report.imported += 1;
        }
      }

      cursor = page.cursor;
    } while (cursor);
  } catch (error) {
    report.errors += 1;
    console.error('Import failed with runtime error:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('Import summary:', JSON.stringify(report, null, 2));

  if (report.errors > 0) {
    process.exitCode = 1;
  }
}

void main();
