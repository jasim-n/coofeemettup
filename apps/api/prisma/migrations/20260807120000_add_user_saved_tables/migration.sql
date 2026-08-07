-- Saved/bookmarked tables per user (mirrors blockedUserIds).
ALTER TABLE "User" ADD COLUMN "savedTableIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
