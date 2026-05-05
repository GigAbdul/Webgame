import { z } from 'zod';

export const startSessionSchema = z.object({
  levelId: z.string().min(1),
  clientVersion: z.string().max(50).optional(),
});

export const finishSessionSchema = z.object({
  progressPercent: z.number().min(100).max(100),
  completionTimeMs: z.number().int().min(3000).max(60 * 60 * 1000),
});

export const failSessionSchema = z.object({
  progressPercent: z.number().min(0).max(100),
});

