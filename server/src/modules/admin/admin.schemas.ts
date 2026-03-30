import { Difficulty, LevelStatus } from '@prisma/client';
import { z } from 'zod';
import { createLevelSchema } from '../levels/levels.schemas';

export const officialSettingsSchema = z.object({
  title: z.string().min(3).max(80).optional(),
  description: z.string().max(500).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  starsReward: z.number().int().min(0).optional(),
  status: z.nativeEnum(LevelStatus).optional(),
  featured: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

export const createOfficialLevelSchema = createLevelSchema.extend({
  difficulty: z.nativeEnum(Difficulty).optional(),
  starsReward: z.number().int().min(0).default(0),
  publishNow: z.boolean().default(false),
  featured: z.boolean().default(false),
  isVisible: z.boolean().default(true),
});

export const starsSchema = z.object({
  starsReward: z.number().int().positive(),
});

export const difficultySchema = z.object({
  difficulty: z.nativeEnum(Difficulty),
});

export const publishLevelSchema = z.object({
  difficulty: z.nativeEnum(Difficulty),
  starsReward: z.number().int().positive(),
});

export function assertOfficialSettings(input: {
  status?: LevelStatus;
  difficulty?: Difficulty | null;
  starsReward?: number;
  currentStatus?: LevelStatus;
}) {
  const effectiveStatus = input.status ?? input.currentStatus;

  if (effectiveStatus === 'OFFICIAL') {
    if (!input.difficulty) {
      throw new Error('Official levels must have a difficulty');
    }

    if (!input.starsReward || input.starsReward <= 0) {
      throw new Error('Official levels must grant at least 1 star');
    }
  }
}
