-- Table invitations: a host invites a user to their table.
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE');

CREATE TABLE "TableInvite" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TableInvite_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TableInvite_inviteeId_idx" ON "TableInvite"("inviteeId");
CREATE INDEX "TableInvite_tableId_idx" ON "TableInvite"("tableId");
CREATE UNIQUE INDEX "TableInvite_tableId_inviteeId_key" ON "TableInvite"("tableId", "inviteeId");
ALTER TABLE "TableInvite" ADD CONSTRAINT "TableInvite_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TableInvite" ADD CONSTRAINT "TableInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TableInvite" ADD CONSTRAINT "TableInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
