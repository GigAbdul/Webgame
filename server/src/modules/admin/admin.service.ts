import { Difficulty, LevelStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { slugifyValue, withSlugSuffix } from '../../utils/slugify';
import { gameService } from '../game/game.service';
import type { CreateLevelInput } from '../levels/levels.schemas';
import { assertOfficialSettings } from './admin.schemas';

async function createUniqueSlug(tx: Prisma.TransactionClient, title: string) {
  const base = slugifyValue(title) || 'level';
  const existing = await tx.level.findUnique({ where: { slug: base } });

  if (!existing) {
    return base;
  }

  return withSlugSuffix(base, crypto.randomUUID());
}

type OfficialSettingsPatch = {
  title?: string;
  description?: string;
  difficulty?: Difficulty;
  starsReward?: number;
  status?: LevelStatus;
  featured?: boolean;
  isVisible?: boolean;
};

export const adminService = {
  async listLevels() {
    return prisma.level.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        publishedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });
  },

  async getLevel(id: string) {
    const level = await prisma.level.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        publishedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!level) {
      throw new ApiError(404, 'Level not found');
    }

    return level;
  },

  async createOfficial(
    adminUserId: string,
    input: CreateLevelInput & {
      difficulty?: Difficulty;
      starsReward: number;
      publishNow: boolean;
      featured: boolean;
      isVisible: boolean;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const slug = await createUniqueSlug(tx, input.title);

      if (input.publishNow) {
        assertOfficialSettings({
          currentStatus: 'OFFICIAL',
          difficulty: input.difficulty ?? null,
          starsReward: input.starsReward,
        });
      }

      return tx.level.create({
        data: {
          slug,
          title: input.title,
          description: input.description,
          authorId: adminUserId,
          publishedById: input.publishNow ? adminUserId : null,
          sourceType: 'ADMIN_CREATED',
          status: input.publishNow ? 'OFFICIAL' : 'DRAFT',
          difficulty: input.publishNow ? input.difficulty : null,
          starsReward: input.publishNow ? input.starsReward : 0,
          isOfficial: input.publishNow,
          featured: input.featured,
          isVisible: input.isVisible,
          theme: input.theme,
          dataJson: input.dataJson,
          publishedAt: input.publishNow ? new Date() : null,
        },
      });
    });
  },

  async updateOfficialSettings(adminUserId: string, levelId: string, patch: OfficialSettingsPatch) {
    return prisma.$transaction(async (tx) => {
      const level = await tx.level.findUnique({
        where: { id: levelId },
      });

      if (!level) {
        throw new ApiError(404, 'Level not found');
      }

      const nextStatus = patch.status ?? level.status;
      const nextDifficulty = patch.difficulty ?? level.difficulty;
      const nextStarsReward = patch.starsReward ?? level.starsReward;

      try {
        assertOfficialSettings({
          currentStatus: nextStatus,
          difficulty: nextDifficulty,
          starsReward: nextStarsReward,
        });
      } catch (error) {
        throw new ApiError(400, error instanceof Error ? error.message : 'Invalid official settings');
      }

      const updated = await tx.level.update({
        where: { id: levelId },
        data: {
          title: patch.title,
          description: patch.description,
          difficulty: nextStatus === 'OFFICIAL' ? nextDifficulty : null,
          starsReward: nextStatus === 'OFFICIAL' ? nextStarsReward : 0,
          status: nextStatus,
          isOfficial: nextStatus === 'OFFICIAL',
          featured: patch.featured,
          isVisible: patch.isVisible,
          publishedById: nextStatus === 'OFFICIAL' ? adminUserId : level.publishedById,
          publishedAt:
            nextStatus === 'OFFICIAL' && !level.publishedAt ? new Date() : level.publishedAt,
          archivedAt: nextStatus === 'ARCHIVED' ? new Date() : null,
        },
      });

      if (level.status === 'OFFICIAL' && patch.starsReward && patch.starsReward !== level.starsReward) {
        await tx.levelReward.updateMany({
          where: { levelId },
          data: { starsAwarded: patch.starsReward },
        });

        const rewards = await tx.levelReward.findMany({
          where: { levelId },
          select: { userId: true },
        });

        await gameService.syncUserStats(
          tx,
          rewards.map((reward) => reward.userId),
        );
      }

      return updated;
    });
  },

  async publishLevel(
    adminUserId: string,
    levelId: string,
    input: { starsReward: number; difficulty: Difficulty },
  ) {
    return this.updateOfficialSettings(adminUserId, levelId, {
      status: 'OFFICIAL',
      starsReward: input.starsReward,
      difficulty: input.difficulty,
    });
  },

  async archiveLevel(adminUserId: string, levelId: string) {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      select: { id: true },
    });

    if (!level) {
      throw new ApiError(404, 'Level not found');
    }

    return this.updateOfficialSettings(adminUserId, levelId, {
      status: 'ARCHIVED',
    });
  },

  async patchStars(adminUserId: string, levelId: string, starsReward: number) {
    return this.updateOfficialSettings(adminUserId, levelId, { starsReward });
  },

  async patchDifficulty(adminUserId: string, levelId: string, difficulty: Difficulty) {
    return this.updateOfficialSettings(adminUserId, levelId, { difficulty });
  },

  async recalculateStars(levelId: string) {
    const rewards = await prisma.levelReward.findMany({
      where: { levelId },
      select: { userId: true },
    });

    await prisma.$transaction(async (tx) => {
      await gameService.syncUserStats(
        tx,
        rewards.map((reward) => reward.userId),
      );
    });

    return {
      affectedUsers: rewards.length,
    };
  },

  async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        totalStars: true,
        completedOfficialLevels: true,
        createdAt: true,
      },
      orderBy: [{ role: 'desc' }, { totalStars: 'desc' }, { username: 'asc' }],
    });
  },

  async stats() {
    const [users, levels, officialLevels, submittedLevels] = await Promise.all([
      prisma.user.count(),
      prisma.level.count(),
      prisma.level.count({ where: { isOfficial: true, status: 'OFFICIAL' } }),
      prisma.level.count({ where: { status: 'SUBMITTED' } }),
    ]);

    return {
      users,
      levels,
      officialLevels,
      submittedLevels,
    };
  },
};

