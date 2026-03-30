import { describe, expect, it } from 'vitest';
import { sortLeaderboardUsers } from '../src/modules/leaderboard/leaderboard.logic';

describe('leaderboard sorting', () => {
  it('sorts by stars, then completed levels, then username', () => {
    const sorted = sortLeaderboardUsers([
      { id: '1', username: 'zeta', totalStars: 12, completedOfficialLevels: 3 },
      { id: '2', username: 'alpha', totalStars: 12, completedOfficialLevels: 3 },
      { id: '3', username: 'bravo', totalStars: 14, completedOfficialLevels: 1 },
      { id: '4', username: 'gamma', totalStars: 12, completedOfficialLevels: 5 },
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(['3', '4', '2', '1']);
  });
});

