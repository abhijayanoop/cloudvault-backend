import { z } from 'zod';
import mongoose from 'mongoose';

// Custom ObjectId validator
const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const uploadDocumentSchema = z.object({
  folderId: objectIdSchema.optional(),
  tags: z
    .string()
    .transform((val) => val.split(',').map((tag) => tag.trim()))
    .pipe(z.array(z.string()))
    .optional()
    .default([]),
});

export const updateDocumentSchema = z.object({
  originalName: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .optional(),
  folderId: objectIdSchema.optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export const getDocumentsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(parseInt(val, 10), 100)), // Max 100
  folderId: objectIdSchema.optional(),
  search: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) =>
      val ? val.split(',').map((tag) => tag.trim()) : undefined
    ),
});

export const documentIdSchema = z.object({
  id: objectIdSchema,
});

// Export types
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type GetDocumentsQuery = z.infer<typeof getDocumentsQuerySchema>;
export type DocumentIdParam = z.infer<typeof documentIdSchema>;
