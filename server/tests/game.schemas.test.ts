import { describe, expect, it } from 'vitest';
import { finishSessionSchema } from '../src/modules/game/game.schemas';

describe('game schemas', () => {
  it('requires completed sessions to report full progress', () => {
    const result = finishSessionSchema.safeParse({
      progressPercent: 99,
      completionTimeMs: 5000,
    });

    expect(result.success).toBe(false);
  });

  it('rejects impossibly short completion times', () => {
    const result = finishSessionSchema.safeParse({
      progressPercent: 100,
      completionTimeMs: 1000,
    });

    expect(result.success).toBe(false);
  });
});
