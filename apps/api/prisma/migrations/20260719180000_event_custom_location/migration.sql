-- Optional one-off event location that overrides the cafe on the map + detail.
ALTER TABLE "Event"
  ADD COLUMN "venueName" TEXT,
  ADD COLUMN "venueAddress" TEXT,
  ADD COLUMN "lat" DOUBLE PRECISION,
  ADD COLUMN "lng" DOUBLE PRECISION;
