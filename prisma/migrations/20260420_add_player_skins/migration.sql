CREATE TYPE "PlayerSkinMode" AS ENUM ('CUBE', 'BALL', 'SHIP', 'ARROW');

CREATE TABLE "PlayerSkin" (
    "id" TEXT NOT NULL,
    "mode" "PlayerSkinMode" NOT NULL,
    "dataJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSkin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerSkin_mode_key" ON "PlayerSkin"("mode");
