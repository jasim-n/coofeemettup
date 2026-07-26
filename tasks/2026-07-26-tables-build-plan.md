# Tables direction — phased build plan

Decisions locked in `docs/design/DESIGN-BRIEF.md` §5. Tables are **additive** (new domain
alongside existing Events). Reference flows: `docs/design/reference/`.

## Phase 1 — Foundation (model shift) ← START HERE
- **`canHost` flag** on User (default false) + admin toggle (admin console) + API guard.
- **Table** model: hostId, venue (cafeId OR custom venueName/lat/lng), startAt, seats, category,
  description, rules, pricePKR (nullable = free), status (OPEN/FULL/CLOSED/CANCELLED/COMPLETED),
  seatsLeft. Migration.
- **TableJoinRequest** model: tableId, userId, status (PENDING/APPROVED/DECLINED/CANCELLED),
  createdAt. One per (table,user).
- Backend: create Table (host-only), list/get, request-to-join, host approve/decline (approve →
  seat taken; if paid → payment due), leave. Notifications on request/approve/decline.
- Per-table **chat** gated on APPROVED membership (reuse GroupMessage keyed by tableId).
- Types + api-client. e2e: host-only create, request→approve→seat, decline, capacity, non-host rejected.

## Phase 2 — Reskin (light + teal, Manrope/Poppins)
- New token set in globals.css (teal brand, near-black ink, light bg); swap fonts in layout.
- Update shared UI (button/card/badge/input) + re-verify every page. Web first.

## Phase 3 — Create-Table wizard
- Multi-step (Venue → Date/Time → Seats → Category → Description/Rules → Publish) with the map
  picker; host-only entry (hidden for non-hosts). Web, then mobile.

## Phase 4 — Nearby + Discover
- **Nearby Tables**: location-sorted list/map of open tables. **Discover**: search + filters
  (category, date, price free/paid, area).

## Phase 5 — Reviews
- After a table completes: guest rates host+table; host rates guests (feeds reliability).
- Profile → Reviews (received), Past Tables.

## Mobile pass (folded in)
- Splash + Onboarding carousel + Permissions (push/location) screens.
- Nav → Nearby / Discover / Chat / Profile; Create-Table for hosts.

## Guardrails
- Additive — do NOT break the existing Events/bookings/matching flow.
- Keep every phase green (tsc/lint/build/e2e) + commit+push per phase.
