-- Add a unique index on Booking.paymentRef (nulls allowed; used to look up bookings from payment webhooks).
CREATE UNIQUE INDEX "Booking_paymentRef_key" ON "Booking"("paymentRef");
