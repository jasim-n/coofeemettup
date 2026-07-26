-- Reviews: per-table ratings that aggregate into per-profile reputation.
CREATE TYPE "ReviewRole" AS ENUM ('HOST', 'GUEST');

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "role" "ReviewRole" NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Review_tableId_reviewerId_subjectId_key" ON "Review"("tableId", "reviewerId", "subjectId");
CREATE INDEX "Review_subjectId_role_idx" ON "Review"("subjectId", "role");
CREATE INDEX "Review_tableId_idx" ON "Review"("tableId");
