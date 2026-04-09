import type { Difficulty } from '@prisma/client';

export const difficultyOrder: Difficulty[] = [
  'EASY',
  'NORMAL',
  'HARD',
  'HARDER',
  'INSANE',
  'DEMON',
  'EASY_DEMON',
  'MEDIUM_DEMON',
  'HARD_DEMON',
  'INSANE_DEMON',
  'EXTREME_DEMON',
];

export const difficultyStarsMap: Record<Difficulty, number> = {
  EASY: 2,
  NORMAL: 4,
  HARD: 6,
  HARDER: 8,
  INSANE: 10,
  DEMON: 10,
  EASY_DEMON: 10,
  MEDIUM_DEMON: 10,
  HARD_DEMON: 10,
  INSANE_DEMON: 10,
  EXTREME_DEMON: 10,
};

export function getStarsForDifficulty(difficulty: Difficulty) {
  return difficultyStarsMap[difficulty];
}
