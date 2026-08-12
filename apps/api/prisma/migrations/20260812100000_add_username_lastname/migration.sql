-- Privacy identity model: public @handle + private full last name. Additive.
-- `username` is the ONLY identity other users see; `lastName` is private (self/admin).
-- Nullable + unique (multiple NULLs allowed in Postgres) so existing rows migrate
-- cleanly; a backfill populates handles and the app enforces presence at signup.
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
