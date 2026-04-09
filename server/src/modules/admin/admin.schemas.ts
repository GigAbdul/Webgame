import { Difficulty, LevelStatus } from '@prisma/client';
import { z } from 'zod';
import { createLevelSchema } from '../levels/levels.schemas';

export const officialSettingsSchema = z.object({
  title: z.string().min(3).max(80).optional(),
  description: z.string().max(500).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  status: z.nativeEnum(LevelStatus).optional(),
  featured: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

export const createOfficialLevelSchema = createLevelSchema.extend({
  difficulty: z.nativeEnum(Difficulty).optional(),
  publishNow: z.boolean().default(false),
  featured: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});

export const difficultySchema = z.object({
  difficulty: z.nativeEnum(Difficulty),
});

export const publishLevelSchema = difficultySchema;

export function assertOfficialSettings(input: {
  status?: LevelStatus;
  difficulty?: Difficulty | null;
  currentStatus?: LevelStatus;
}) {
  const effectiveStatus = input.status ?? input.currentStatus;

  if (effectiveStatus === 'OFFICIAL') {
    if (!input.difficulty) {
      throw new Error('Official levels must have a difficulty');
    }
  }
}
