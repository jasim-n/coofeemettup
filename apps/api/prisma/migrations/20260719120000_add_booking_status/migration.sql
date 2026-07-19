-- Booking lifecycle: ACTIVE / WAITLISTED / CANCELLED + cancel/waitlist timestamps.
CREATE TYPE "BookingStatus" AS ENUM ('ACTIVE', 'WAITLISTED', 'CANCELLED');

ALTER TABLE "Booking"
  ADD COLUMN "status" "BookingStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "waitlistedAt" TIMESTAMP(3);

CREATE INDEX "Booking_eventId_status_waitlistedAt_idx" ON "Booking"("eventId", "status", "waitlistedAt");
