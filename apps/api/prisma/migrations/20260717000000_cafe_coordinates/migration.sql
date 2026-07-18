-- Add optional coordinates to Cafe (for the events map).
ALTER TABLE "Cafe" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "Cafe" ADD COLUMN "lng" DOUBLE PRECISION;
