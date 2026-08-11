-- One reaction per user per message (a new emoji replaces the previous one).
-- Dedup existing rows first: keep the most recent per (messageId, userId).
DELETE FROM "MessageReaction" a
USING "MessageReaction" b
WHERE a."messageId" = b."messageId"
  AND a."userId" = b."userId"
  AND (a."createdAt" < b."createdAt"
       OR (a."createdAt" = b."createdAt" AND a."id" > b."id"));

DROP INDEX "MessageReaction_messageId_userId_emoji_key";
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_key" ON "MessageReaction"("messageId", "userId");
