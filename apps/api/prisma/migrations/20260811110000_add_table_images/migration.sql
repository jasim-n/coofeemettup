-- Event photos shared by the host; joined members view, only the host adds. Additive.
CREATE TABLE "TableImage" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TableImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TableImage_tableId_idx" ON "TableImage"("tableId");
ALTER TABLE "TableImage" ADD CONSTRAINT "TableImage_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
