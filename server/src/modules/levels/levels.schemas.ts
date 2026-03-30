import { z } from 'zod';
import { levelDataSchema } from './level-data';

export const createLevelSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(500).default(''),
  theme: z.string().min(2).max(50).default('neon-grid'),
  dataJson: levelDataSchema,
});

export const updateLevelSchema = createLevelSchema.partial().extend({
  versionNumber: z.number().int().positive().optional(),
});

export type CreateLevelInput = z.infer<typeof createLevelSchema>;
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;

