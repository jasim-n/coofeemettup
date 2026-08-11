-- Admin-curated featured flag for event photos shown on the home page. Additive.
ALTER TABLE "TableImage" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "TableImage_featured_idx" ON "TableImage"("featured");
