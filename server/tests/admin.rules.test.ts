import { describe, expect, it } from 'vitest';
import { getStarsForDifficulty } from '../src/modules/levels/difficulty';
import { assertOfficialSettings } from '../src/modules/admin/admin.schemas';

describe('official settings validation', () => {
  it('requires difficulty when making a level official', () => {
    expect(() =>
      assertOfficialSettings({
        currentStatus: 'OFFICIAL',
        difficulty: null,
      }),
    ).toThrow();
  });

  it('allows valid official settings', () => {
    expect(() =>
      assertOfficialSettings({
        currentStatus: 'OFFICIAL',
        difficulty: 'HARD',
      }),
    ).not.toThrow();
  });

  it('keeps every demon rank at 10 stars', () => {
    expect(getStarsForDifficulty('DEMON')).toBe(10);
    expect(getStarsForDifficulty('EASY_DEMON')).toBe(10);
    expect(getStarsForDifficulty('MEDIUM_DEMON')).toBe(10);
    expect(getStarsForDifficulty('HARD_DEMON')).toBe(10);
    expect(getStarsForDifficulty('INSANE_DEMON')).toBe(10);
    expect(getStarsForDifficulty('EXTREME_DEMON')).toBe(10);
  });
});

