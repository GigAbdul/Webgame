ALTER TYPE "Difficulty" ADD VALUE IF NOT EXISTS 'EASY_DEMON';
ALTER TYPE "Difficulty" ADD VALUE IF NOT EXISTS 'MEDIUM_DEMON';
ALTER TYPE "Difficulty" ADD VALUE IF NOT EXISTS 'HARD_DEMON';
ALTER TYPE "Difficulty" ADD VALUE IF NOT EXISTS 'INSANE_DEMON';
ALTER TYPE "Difficulty" ADD VALUE IF NOT EXISTS 'EXTREME_DEMON';

UPDATE "Level"
SET "starsReward" = CASE
  WHEN "difficulty" = 'EASY' THEN 2
  WHEN "difficulty" = 'NORMAL' THEN 4
  WHEN "difficulty" = 'HARD' THEN 6
  WHEN "difficulty" = 'HARDER' THEN 8
  WHEN "difficulty" = 'INSANE' THEN 10
  WHEN "difficulty" IN ('DEMON', 'EASY_DEMON', 'MEDIUM_DEMON', 'HARD_DEMON', 'INSANE_DEMON', 'EXTREME_DEMON') THEN 10
  ELSE 0
END
WHERE "difficulty" IS NOT NULL;

UPDATE "LevelReward" AS "reward"
SET "starsAwarded" = "level"."starsReward"
FROM "Level" AS "level"
WHERE "reward"."levelId" = "level"."id";

UPDATE "User"
SET
  "totalStars" = 0,
  "completedOfficialLevels" = 0;

UPDATE "User" AS "user"
SET
  "totalStars" = "stats"."totalStars",
  "completedOfficialLevels" = "stats"."completedOfficialLevels"
FROM (
  SELECT
    "userId",
    COALESCE(SUM("starsAwarded"), 0)::integer AS "totalStars",
    COUNT(*)::integer AS "completedOfficialLevels"
  FROM "LevelReward"
  GROUP BY "userId"
) AS "stats"
WHERE "user"."id" = "stats"."userId";
