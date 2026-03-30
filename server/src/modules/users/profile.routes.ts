import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/async-handler';

export const profileRouter = Router();

profileRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    const userId = request.authUser!.id;

    const [user, myLevels, recentRewards] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          totalStars: true,
          completedOfficialLevels: true,
          createdAt: true,
        },
      }),
      prisma.level.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          title: true,
          status: true,
          isOfficial: true,
          starsReward: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.levelReward.findMany({
        where: { userId },
        select: {
          starsAwarded: true,
          awardedAt: true,
          level: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
        orderBy: {
          awardedAt: 'desc',
        },
        take: 5,
      }),
    ]);

    response.json({
      user,
      levels: myLevels,
      recentRewards,
    });
  }),
);
