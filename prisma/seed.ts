import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  createEmptyLevelData,
  createSampleLevelDataOne,
  createSampleLevelDataTwo,
} from '../server/src/modules/levels/level-data';
import { getStarsForDifficulty } from '../server/src/modules/levels/difficulty';

config();

const prisma = new PrismaClient();

async function syncUserStats(userId: string) {
  const rewards = await prisma.levelReward.findMany({
    where: { userId },
    select: { starsAwarded: true },
  });

  const totalStars = rewards.reduce((sum, reward) => sum + reward.starsAwarded, 0);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalStars,
      completedOfficialLevels: rewards.length,
    },
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!';
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';

  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const demoPasswordHash = await bcrypt.hash('Player123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      username: adminUsername,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const playerOne = await prisma.user.upsert({
    where: { email: 'nova@example.com' },
    update: {
      username: 'nova',
      passwordHash: demoPasswordHash,
      role: 'USER',
    },
    create: {
      email: 'nova@example.com',
      username: 'nova',
      passwordHash: demoPasswordHash,
      role: 'USER',
    },
  });

  const playerTwo = await prisma.user.upsert({
    where: { email: 'pulse@example.com' },
    update: {
      username: 'pulse',
      passwordHash: demoPasswordHash,
      role: 'USER',
    },
    create: {
      email: 'pulse@example.com',
      username: 'pulse',
      passwordHash: demoPasswordHash,
      role: 'USER',
    },
  });

  const officialOne = await prisma.level.upsert({
    where: { slug: 'aurora-trial' },
    update: {
      title: 'Aurora Trial',
      description: 'A brisk neon opening course with pads, portals, and a gravity flip.',
      authorId: admin.id,
      publishedById: admin.id,
      sourceType: 'ADMIN_CREATED',
      status: 'OFFICIAL',
      difficulty: 'NORMAL',
      starsReward: getStarsForDifficulty('NORMAL'),
      isOfficial: true,
      theme: 'aurora-grid',
      featured: true,
      isVisible: true,
      publishedAt: new Date(),
      dataJson: createSampleLevelDataOne(),
    },
    create: {
      slug: 'aurora-trial',
      title: 'Aurora Trial',
      description: 'A brisk neon opening course with pads, portals, and a gravity flip.',
      authorId: admin.id,
      publishedById: admin.id,
      sourceType: 'ADMIN_CREATED',
      status: 'OFFICIAL',
      difficulty: 'NORMAL',
      starsReward: getStarsForDifficulty('NORMAL'),
      isOfficial: true,
      theme: 'aurora-grid',
      featured: true,
      isVisible: true,
      publishedAt: new Date(),
      dataJson: createSampleLevelDataOne(),
    },
  });

  const officialTwo = await prisma.level.upsert({
    where: { slug: 'molten-drop' },
    update: {
      title: 'Molten Drop',
      description: 'A longer demo route showing speed changes, higher platforms, and tighter timing.',
      authorId: admin.id,
      publishedById: admin.id,
      sourceType: 'ADMIN_CREATED',
      status: 'OFFICIAL',
      difficulty: 'HARD',
      starsReward: getStarsForDifficulty('HARD'),
      isOfficial: true,
      theme: 'molten-sunset',
      featured: false,
      isVisible: true,
      publishedAt: new Date(),
      dataJson: createSampleLevelDataTwo(),
    },
    create: {
      slug: 'molten-drop',
      title: 'Molten Drop',
      description: 'A longer demo route showing speed changes, higher platforms, and tighter timing.',
      authorId: admin.id,
      publishedById: admin.id,
      sourceType: 'ADMIN_CREATED',
      status: 'OFFICIAL',
      difficulty: 'HARD',
      starsReward: getStarsForDifficulty('HARD'),
      isOfficial: true,
      theme: 'molten-sunset',
      featured: false,
      isVisible: true,
      publishedAt: new Date(),
      dataJson: createSampleLevelDataTwo(),
    },
  });

  await prisma.level.upsert({
    where: { slug: 'nova-crystal-draft' },
    update: {
      title: 'Nova Crystal Draft',
      description: 'A submitted player concept ready for admin review.',
      authorId: playerOne.id,
      sourceType: 'USER_CREATED',
      status: 'SUBMITTED',
      difficulty: null,
      starsReward: 0,
      isOfficial: false,
      theme: 'neon-grid',
      dataJson: createEmptyLevelData('neon-grid'),
    },
    create: {
      slug: 'nova-crystal-draft',
      title: 'Nova Crystal Draft',
      description: 'A submitted player concept ready for admin review.',
      authorId: playerOne.id,
      sourceType: 'USER_CREATED',
      status: 'SUBMITTED',
      difficulty: null,
      starsReward: 0,
      isOfficial: false,
      theme: 'neon-grid',
      dataJson: createEmptyLevelData('neon-grid'),
    },
  });

  await prisma.levelReward.upsert({
    where: {
      userId_levelId: {
        userId: playerOne.id,
        levelId: officialOne.id,
      },
    },
    update: {
      starsAwarded: officialOne.starsReward,
    },
    create: {
      userId: playerOne.id,
      levelId: officialOne.id,
      starsAwarded: officialOne.starsReward,
    },
  });

  await prisma.levelReward.upsert({
    where: {
      userId_levelId: {
        userId: playerOne.id,
        levelId: officialTwo.id,
      },
    },
    update: {
      starsAwarded: officialTwo.starsReward,
    },
    create: {
      userId: playerOne.id,
      levelId: officialTwo.id,
      starsAwarded: officialTwo.starsReward,
    },
  });

  await prisma.levelReward.upsert({
    where: {
      userId_levelId: {
        userId: playerTwo.id,
        levelId: officialOne.id,
      },
    },
    update: {
      starsAwarded: officialOne.starsReward,
    },
    create: {
      userId: playerTwo.id,
      levelId: officialOne.id,
      starsAwarded: officialOne.starsReward,
    },
  });

  await Promise.all([syncUserStats(admin.id), syncUserStats(playerOne.id), syncUserStats(playerTwo.id)]);

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
