-- CreateEnum
CREATE TYPE "TableMediaKind" AS ENUM ('IMAGE', 'VIDEO', 'COLLAGE');

-- AlterTable
ALTER TABLE "TableImage" ADD COLUMN "kind" "TableMediaKind" NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "TableImage" ADD COLUMN "posterUrl" TEXT;
ALTER TABLE "TableImage" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "TableImage" ADD COLUMN "collageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TableImage" ADD COLUMN "caption" TEXT;
ALTER TABLE "TableImage" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX IF EXISTS "TableImage_featured_idx";

-- CreateIndex
CREATE INDEX "TableImage_featured_sortOrder_idx" ON "TableImage"("featured", "sortOrder");
