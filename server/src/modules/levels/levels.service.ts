import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { slugifyValue, withSlugSuffix } from '../../utils/slugify';
import type { LevelData } from './level-data';
import { levelDataSchema } from './level-data';
import type { CreateLevelInput, UpdateLevelInput } from './levels.schemas';

async function createUniqueSlug(title: string) {
  const base = slugifyValue(title) || 'level';
  const existing = await prisma.level.findUnique({
    where: {
      slug: base,
    },
  });

  if (!existing) {
    return base;
  }

  return withSlugSuffix(base, crypto.randomUUID());
}

function assertMutableLevelOwnership(
  level: { authorId: string; isOfficial: boolean },
  user: { id: string; role: Role },
) {
  if (user.role === 'ADMIN') {
    return;
  }

  if (level.authorId !== user.id) {
    throw new ApiError(403, 'You do not own this level');
  }

  if (level.isOfficial) {
    throw new ApiError(403, 'Official levels can only be edited by admins');
  }
}

function normalizeLevelData(data: LevelData) {
  return levelDataSchema.parse(data);
}

export const levelsService = {
  async listOfficial() {
    return prisma.level.findMany({
      where: {
        status: 'OFFICIAL',
        isOfficial: true,
        isVisible: true,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    });
  },

  async getOfficial(slugOrId: string) {
    const level = await prisma.level.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        status: 'OFFICIAL',
        isOfficial: true,
        isVisible: true,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!level) {
      throw new ApiError(404, 'Official level not found');
    }

    return level;
  },

  async getMine(userId: string) {
    return prisma.level.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async getById(user: { id: string; role: Role }, levelId: string) {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      include: {
        author: {
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

    if (user.role !== 'ADMIN' && level.authorId !== user.id && !level.isOfficial) {
      throw new ApiError(403, 'You cannot access this level');
    }

    return level;
  },

  async create(user: { id: string }, input: CreateLevelInput) {
    const slug = await createUniqueSlug(input.title);

    return prisma.level.create({
      data: {
        slug,
        title: input.title,
        description: input.description,
        authorId: user.id,
        theme: input.theme,
        dataJson: normalizeLevelData(input.dataJson),
      },
    });
  },

  async update(user: { id: string; role: Role }, levelId: string, input: UpdateLevelInput) {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      select: {
        id: true,
        authorId: true,
        isOfficial: true,
        versionNumber: true,
      },
    });

    if (!level) {
      throw new ApiError(404, 'Level not found');
    }

    assertMutableLevelOwnership(level, user);

    const slug = input.title ? await createUniqueSlug(input.title) : undefined;

    return prisma.level.update({
      where: { id: levelId },
      data: {
        title: input.title,
        description: input.description,
        theme: input.theme,
        slug,
        dataJson: input.dataJson ? normalizeLevelData(input.dataJson) : undefined,
        versionNumber: input.dataJson ? level.versionNumber + 1 : level.versionNumber,
      },
    });
  },

  async delete(user: { id: string; role: Role }, levelId: string) {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      select: {
        id: true,
        authorId: true,
        isOfficial: true,
      },
    });

    if (!level) {
      throw new ApiError(404, 'Level not found');
    }

    assertMutableLevelOwnership(level, user);

    return prisma.level.delete({
      where: { id: levelId },
    });
  },

  async submit(user: { id: string }, levelId: string) {
    const level = await prisma.level.findUnique({
      where: { id: levelId },
      select: {
        id: true,
        authorId: true,
        status: true,
        isOfficial: true,
      },
    });

    if (!level) {
      throw new ApiError(404, 'Level not found');
    }

    if (level.authorId !== user.id) {
      throw new ApiError(403, 'You do not own this level');
    }

    if (level.isOfficial) {
      throw new ApiError(400, 'Official levels cannot be submitted');
    }

    if (level.status !== 'DRAFT') {
      throw new ApiError(400, 'Only draft levels can be submitted');
    }

    return prisma.level.update({
      where: { id: levelId },
      data: {
        status: 'SUBMITTED',
      },
    });
  },
};

