-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LevelStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'OFFICIAL', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LevelSourceType" AS ENUM ('USER_CREATED', 'ADMIN_CREATED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'NORMAL', 'HARD', 'HARDER', 'INSANE', 'DEMON');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('STARTED', 'FAILED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AttemptResult" AS ENUM ('FAILED', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "totalStars" INTEGER NOT NULL DEFAULT 0,
    "completedOfficialLevels" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,
    "publishedById" TEXT,
    "sourceType" "LevelSourceType" NOT NULL DEFAULT 'USER_CREATED',
    "status" "LevelStatus" NOT NULL DEFAULT 'DRAFT',
    "difficulty" "Difficulty",
    "starsReward" INTEGER NOT NULL DEFAULT 0,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'neon-grid',
    "dataJson" JSONB NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "previewImageUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "levelId" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "clientVersion" TEXT,
    "progressPercent" INTEGER,
    "completionTimeMs" INTEGER,
    "rewardGranted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "gameSessionId" TEXT,
    "result" "AttemptResult" NOT NULL,
    "bestPercent" INTEGER NOT NULL DEFAULT 0,
    "completionTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "starsAwarded" INTEGER NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdFromAttemptId" TEXT,

    CONSTRAINT "LevelReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Level_slug_key" ON "Level"("slug");

-- CreateIndex
CREATE INDEX "Level_status_isOfficial_createdAt_idx" ON "Level"("status", "isOfficial", "createdAt");

-- CreateIndex
CREATE INDEX "Level_authorId_status_idx" ON "Level"("authorId", "status");

-- CreateIndex
CREATE INDEX "GameSession_userId_levelId_idx" ON "GameSession"("userId", "levelId");

-- CreateIndex
CREATE INDEX "LevelAttempt_userId_levelId_createdAt_idx" ON "LevelAttempt"("userId", "levelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LevelReward_createdFromAttemptId_key" ON "LevelReward"("createdFromAttemptId");

-- CreateIndex
CREATE INDEX "LevelReward_levelId_idx" ON "LevelReward"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelReward_userId_levelId_key" ON "LevelReward"("userId", "levelId");

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelAttempt" ADD CONSTRAINT "LevelAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelAttempt" ADD CONSTRAINT "LevelAttempt_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelAttempt" ADD CONSTRAINT "LevelAttempt_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelReward" ADD CONSTRAINT "LevelReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelReward" ADD CONSTRAINT "LevelReward_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelReward" ADD CONSTRAINT "LevelReward_createdFromAttemptId_fkey" FOREIGN KEY ("createdFromAttemptId") REFERENCES "LevelAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

