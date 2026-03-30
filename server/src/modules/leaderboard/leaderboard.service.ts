import { prisma } from '../../lib/prisma';
import { sortLeaderboardUsers } from './leaderboard.logic';

export const leaderboardService = {
  async getLeaderboard(limit = 100) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        totalStars: true,
        completedOfficialLevels: true,
        createdAt: true,
      },
    });

    const sorted = sortLeaderboardUsers(users).slice(0, limit);

    return sorted.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
  },

  async getMyRank(userId: string) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        totalStars: true,
        completedOfficialLevels: true,
      },
    });

    const sorted = sortLeaderboardUsers(users);
    const rankIndex = sorted.findIndex((entry) => entry.id === userId);

    if (rankIndex === -1) {
      return null;
    }

    return {
      rank: rankIndex + 1,
      ...sorted[rankIndex],
    };
  },
};

