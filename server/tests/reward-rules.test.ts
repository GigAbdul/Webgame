import { describe, expect, it } from 'vitest';
import { canGrantReward, computeUserStatsFromRewards } from '../src/modules/game/reward-rules';

describe('reward rules', () => {
  it('grants reward only for official unrewarded levels', () => {
    expect(canGrantReward({ isOfficial: true, alreadyRewarded: false })).toBe(true);
    expect(canGrantReward({ isOfficial: false, alreadyRewarded: false })).toBe(false);
    expect(canGrantReward({ isOfficial: true, alreadyRewarded: true })).toBe(false);
  });

  it('recomputes total stars from stored rewards', () => {
    expect(
      computeUserStatsFromRewards([{ starsAwarded: 3 }, { starsAwarded: 5 }, { starsAwarded: 2 }]),
    ).toEqual({
      totalStars: 10,
      completedOfficialLevels: 3,
    });
  });
});

