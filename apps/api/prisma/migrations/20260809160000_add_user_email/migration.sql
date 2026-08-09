-- Email login identity (nullable so existing rows are backfilled by seed, then required for new signups).
ALTER TABLE "User" ADD COLUMN "email" TEXT;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
