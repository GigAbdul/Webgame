import { prisma } from '../../lib/prisma';
import { sortLeaderboardUsers } from './leaderboard.logic';

async function getOfficialLevelCountMap() {
  const authoredOfficialLevels = await prisma.level.groupBy({
    by: ['authorId'],
    where: {
      isOfficial: true,
      status: 'OFFICIAL',
      isVisible: true,
    },
    _count: {
      _all: true,
    },
  });

  return new Map(authoredOfficialLevels.map((entry) => [entry.authorId, entry._count._all] as const));
}

export const leaderboardService = {
  async getLeaderboard(limit = 100) {
    const [users, officialLevelCountMap] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          totalStars: true,
          completedOfficialLevels: true,
          createdAt: true,
        },
      }),
      getOfficialLevelCountMap(),
    ]);

    const sorted = sortLeaderboardUsers(users).slice(0, limit);

    return sorted.map((entry, index) => ({
      rank: index + 1,
      ...entry,
      officialLevelsAuthored: officialLevelCountMap.get(entry.id) ?? 0,
    }));
  },

  async getMyRank(userId: string) {
    const [users, officialLevelCountMap] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          totalStars: true,
          completedOfficialLevels: true,
        },
      }),
      getOfficialLevelCountMap(),
    ]);

    const sorted = sortLeaderboardUsers(users);
    const rankIndex = sorted.findIndex((entry) => entry.id === userId);

    if (rankIndex === -1) {
      return null;
    }

    return {
      rank: rankIndex + 1,
      ...sorted[rankIndex],
      officialLevelsAuthored: officialLevelCountMap.get(sorted[rankIndex].id) ?? 0,
    };
  },
};

