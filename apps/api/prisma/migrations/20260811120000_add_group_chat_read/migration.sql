-- Per-user read marker for a table's group chat. Additive.
CREATE TABLE "GroupChatRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupChatRead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupChatRead_userId_tableId_key" ON "GroupChatRead"("userId", "tableId");
CREATE INDEX "GroupChatRead_userId_idx" ON "GroupChatRead"("userId");
