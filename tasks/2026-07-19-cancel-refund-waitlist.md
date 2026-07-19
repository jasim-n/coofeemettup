# Task #50 — Cancel booking + Cancel event + Refund + Waitlist

## Scope
- **What:** Users can cancel their own booking; admins/organizers can cancel an event; refunds follow a 24h cutoff; a FULL event puts joiners on a waitlist that auto-promotes when a seat frees.
- **Why:** Real lifecycle — plans change, events get called off, popular events overflow.
- **Impact:** Booking schema (additive), bookings/events/payments services, shared types + client, web My-Meetups + event-detail + admin.

## Decisions (confirmed)
- **Refund:** cancel >24h before `startAt` → full refund (REFUNDED). Inside 24h → CANCELLED, no refund. Seat released either way. **Event cancellation → always full refund** (org-initiated).
- **Waitlist:** join a FULL event → WAITLISTED. Seat frees → earliest WAITLISTED promoted to ACTIVE + notified to pay. Seat NOT held; first to pay claims it.

## Schema change (additive, non-destructive)
```prisma
enum BookingStatus { ACTIVE WAITLISTED CANCELLED }

model Booking {
  ...
  status        BookingStatus @default(ACTIVE)
  cancelledAt   DateTime?
  waitlistedAt  DateTime?
  ...
}
```
New migration: `add_booking_status`. No data loss (defaults ACTIVE for existing rows).

## Success criteria
- [ ] Cancel PENDING booking → status CANCELLED, no seat change.
- [ ] Cancel PAID booking >24h out → REFUNDED, seatsLeft++, event FULL→OPEN, earliest waitlister promoted + notified.
- [ ] Cancel PAID booking <24h out → CANCELLED (stays PAID), seat still released + promote.
- [ ] Join FULL event → WAITLISTED booking; cannot pay until promoted.
- [ ] Admin cancel event → all non-cancelled bookings CANCELLED, PAID ones REFUNDED, everyone notified; event CANCELLED; drops out of browse.
- [ ] tsc + lint green; migration applied to Neon; curl e2e passes.

## Out of scope
Partial refunds, refund receipts/ledger, waitlist position UI, seat-hold timers, cancellation reasons.

## Tasks
1. **Schema + migration** — enum + 3 fields; hand-author migration.sql; `migrate deploy`.
2. **PaymentProvider.refund seam** — abstract `refund(paymentRef, amountPKR)`; mock no-op; `PaymentsService.refund()` wrapper + audit.
3. **BookingsService.join** — branch ACTIVE vs WAITLISTED by event.status (OPEN/FULL); reactivate CANCELLED row on rejoin.
4. **BookingsService.cancel** — ownership guard; txn: set CANCELLED/REFUNDED, release seat if seat-held, promote earliest waitlister; notify canceller + promoted.
5. **PaymentsService.initiate** — block pay when booking.status !== ACTIVE (waitlisted can't pay).
6. **EventsService.cancelEvent** — set CANCELLED, refund+notify all bookings; audit.
7. **Controllers** — `POST /bookings/:id/cancel` (BookingsController), `POST /events/:id/cancel` (@Roles, EventsController); EventsModule imports PaymentsModule.
8. **Types + client** — BookingStatus, Booking fields; `cancelBooking`, `cancelEvent`.
9. **Web** — My-Meetups cancel button + refund hint; event-detail waitlist join when FULL; admin cancel-event button.
10. **Verify** — tsc/lint, migrate, curl e2e (join→pay→cancel→promote; fill→waitlist; admin cancel).
