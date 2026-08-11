-- Presence: track when a user was last active (updated on authenticated requests). Additive.
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
