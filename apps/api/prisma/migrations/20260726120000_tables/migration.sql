-- Host flag + Tables (host-created, approval-based join).
ALTER TABLE "User" ADD COLUMN "canHost" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "TableStatus" AS ENUM ('OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "JoinStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

CREATE TABLE "Table" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "cafeId" TEXT,
  "venueName" TEXT,
  "venueAddress" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "title" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "seats" INTEGER NOT NULL,
  "seatsLeft" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "rules" TEXT,
  "pricePKR" INTEGER,
  "status" "TableStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Table_status_startAt_idx" ON "Table"("status", "startAt");
CREATE INDEX "Table_hostId_idx" ON "Table"("hostId");
ALTER TABLE "Table" ADD CONSTRAINT "Table_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Table" ADD CONSTRAINT "Table_cafeId_fkey" FOREIGN KEY ("cafeId") REFERENCES "Cafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TableJoinRequest" (
  "id" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "JoinStatus" NOT NULL DEFAULT 'PENDING',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TableJoinRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TableJoinRequest_tableId_userId_key" ON "TableJoinRequest"("tableId", "userId");
CREATE INDEX "TableJoinRequest_tableId_status_idx" ON "TableJoinRequest"("tableId", "status");
CREATE INDEX "TableJoinRequest_userId_idx" ON "TableJoinRequest"("userId");
ALTER TABLE "TableJoinRequest" ADD CONSTRAINT "TableJoinRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
