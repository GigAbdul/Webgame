import { describe, expect, it } from 'vitest';
import { assertOfficialSettings } from '../src/modules/admin/admin.schemas';

describe('official settings validation', () => {
  it('requires stars and difficulty when making a level official', () => {
    expect(() =>
      assertOfficialSettings({
        currentStatus: 'OFFICIAL',
        difficulty: null,
        starsReward: 0,
      }),
    ).toThrow();
  });

  it('allows valid official settings', () => {
    expect(() =>
      assertOfficialSettings({
        currentStatus: 'OFFICIAL',
        difficulty: 'HARD',
        starsReward: 6,
      }),
    ).not.toThrow();
  });
});

