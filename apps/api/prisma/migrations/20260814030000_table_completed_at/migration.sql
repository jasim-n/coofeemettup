-- AlterTable
ALTER TABLE "Table" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill already-completed tables (best-effort: use updatedAt when status is COMPLETED)
UPDATE "Table"
SET "completedAt" = "updatedAt"
WHERE status = 'COMPLETED' AND "completedAt" IS NULL;
