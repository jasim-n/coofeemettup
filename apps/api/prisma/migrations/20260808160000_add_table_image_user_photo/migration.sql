-- Additive: per-table cover image + per-user profile photo (both nullable).
ALTER TABLE "Table" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "photoUrl" TEXT;
