import { z } from 'zod';

export const publishBodySchema = z
  .object({
    title: z.string().optional(),
    content: z.string().optional(),
    slug: z.string().optional()
  })
  .strict();

export const pasteQuerySchema = z
  .object({
    id: z.string().optional()
  })
  .strict();

export const updateBodySchema = z
  .object({
    id: z.string().optional(),
    editCode: z.string().optional(),
    content: z.string().optional()
  })
  .strict();

export const deleteBodySchema = z
  .object({
    id: z.string().optional(),
    editCode: z.string().optional()
  })
  .strict();
