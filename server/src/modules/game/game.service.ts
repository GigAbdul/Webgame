import { GameSessionStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { canGrantReward, computeUserStatsFromRewards } from './reward-rules';

const MIN_COMPLETION_TIME_MS = 3000;
const MAX_CLIENT_CLOCK_DRIFT_MS = 10_000;

async function syncUserStats(tx: Prisma.TransactionClient, userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];

  for (const userId of uniqueIds) {
    const rewards = await tx.levelReward.findMany({
      where: { userId },
      select: { starsAwarded: true },
    });

    const stats = computeUserStatsFromRewards(rewards);

    await tx.user.update({
      where: { id: userId },
      data: stats,
    });
  }
}

export const gameService = {
  async startSession(userId: string, levelId: string, clientVersion?: string) {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      select: {
        id: true,
        status: true,
        isOfficial: true,
        isVisible: true,
      },
    });

    if (!level || !level.isOfficial || level.status !== 'OFFICIAL' || !level.isVisible) {
      throw new ApiError(404, 'Official level not found');
    }

    return prisma.gameSession.create({
      data: {
        userId,
        levelId,
        clientVersion,
      },
    });
  },

  async failSession(userId: string, sessionId: string, progressPercent: number) {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new ApiError(404, 'Game session not found');
    }

    if (session.status !== GameSessionStatus.STARTED) {
      throw new ApiError(400, 'Game session is no longer active');
    }

    const [updatedSession] = await prisma.$transaction([
      prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          status: GameSessionStatus.FAILED,
          progressPercent: Math.floor(progressPercent),
          endedAt: new Date(),
        },
      }),
      prisma.levelAttempt.create({
        data: {
          userId,
          levelId: session.levelId,
          gameSessionId: session.id,
          result: 'FAILED',
          bestPercent: Math.floor(progressPercent),
        },
      }),
    ]);

    return updatedSession;
  },

  async completeSession(
    userId: string,
    sessionId: string,
    progressPercent: number,
    completionTimeMs: number,
  ) {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        level: {
          select: {
            id: true,
            status: true,
            isOfficial: true,
            starsReward: true,
            title: true,
          },
        },
      },
    });

    if (!session || session.userId !== userId) {
      throw new ApiError(404, 'Game session not found');
    }

    if (session.status !== GameSessionStatus.STARTED) {
      throw new ApiError(400, 'Game session is no longer active');
    }

    if (!session.level.isOfficial || session.level.status !== 'OFFICIAL') {
      throw new ApiError(400, 'Only official levels can be completed for rewards');
    }

    if (progressPercent !== 100) {
      throw new ApiError(400, 'Completion rejected by integrity rules');
    }

    if (completionTimeMs < MIN_COMPLETION_TIME_MS) {
      throw new ApiError(400, 'Completion rejected by integrity rules');
    }

    const elapsed = Date.now() - new Date(session.startedAt).getTime();

    if (elapsed < MIN_COMPLETION_TIME_MS) {
      throw new ApiError(400, 'Completion rejected by integrity rules');
    }

    if (completionTimeMs > elapsed + MAX_CLIENT_CLOCK_DRIFT_MS) {
      throw new ApiError(400, 'Completion rejected by integrity rules');
    }

    return prisma.$transaction(async (tx) => {
      const existingReward = await tx.levelReward.findUnique({
        where: {
          userId_levelId: {
            userId,
            levelId: session.level.id,
          },
        },
      });

      const attempt = await tx.levelAttempt.create({
        data: {
          userId,
          levelId: session.level.id,
          gameSessionId: session.id,
          result: 'COMPLETED',
          bestPercent: 100,
          completionTimeMs,
        },
      });

      let starsAwarded = 0;

      if (
        canGrantReward({
          isOfficial: session.level.isOfficial,
          alreadyRewarded: Boolean(existingReward),
        })
      ) {
        starsAwarded = session.level.starsReward;

        await tx.levelReward.create({
          data: {
            userId,
            levelId: session.level.id,
            starsAwarded,
            createdFromAttemptId: attempt.id,
          },
        });
      }

      await tx.gameSession.update({
        where: { id: session.id },
        data: {
          status: GameSessionStatus.COMPLETED,
          progressPercent: 100,
          completionTimeMs,
          rewardGranted: starsAwarded > 0,
          endedAt: new Date(),
        },
      });

      if (starsAwarded > 0) {
        await syncUserStats(tx, [userId]);
      }

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          totalStars: true,
          completedOfficialLevels: true,
        },
      });

      return {
        levelTitle: session.level.title,
        attemptId: attempt.id,
        alreadyRewarded: Boolean(existingReward),
        starsAwarded,
        user,
      };
    });
  },

  syncUserStats,
};

