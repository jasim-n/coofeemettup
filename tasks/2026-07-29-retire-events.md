# Retire Events — reconcile Tables / Meetups

## Scope
Web-only retirement of the old **Events** system. Keep Events/bookings/payments **API + DB dormant** (reversible, no data loss). Repurpose **My meetups** to Tables. Remove admin Event management. Mobile untouched (no Events refs).

## Decisions (confirmed)
- Depth: web-only; API/DB dormant.
- My meetups: **Joined tables + Hosting section**.
- Admin: **remove** Event create/list + `/admin/events`.

## Success criteria
- [ ] No web route or link points to a removed Events page (no 404s / dead links).
- [ ] Nav: Tables · Nearby · Discover · My meetups (no "/events Meetups").
- [ ] `/meetups` shows joined tables (PENDING/APPROVED) with status + Leave, and a Hosting section (myHostedTables) when applicable.
- [ ] Admin page = header + nav + Host access only (no event form/list).
- [ ] tsc + lint + `next build` green; login → dashboard, /meetups, /tables all work.

## Delete (web only)
- `apps/web/src/app/events/**`
- `apps/web/src/app/receipt/**`
- `apps/web/src/app/map/**`
- `apps/web/src/app/admin/events/**`
- `apps/web/src/components/events-map.tsx`

## Edit
- `desktop-nav.tsx` — remove `{ /events, 'Meetups' }` (keep My meetups).
- `page.tsx` — remove mobile `Tile href="/events" "Browse meetups"`.
- `profile/page.tsx:134` — header link `/events` "Meetups" → `/meetups` "My meetups".
- `meetups/page.tsx` — REWRITE: joined tables + hosting; reuse table-card pattern; `api.leaveTable`.
- `admin/page.tsx` — REWRITE: drop event form/list + `events`/`form`/`create`/`load`/cafes-load + LocationPicker + Event/CreateEvent imports; keep header/nav/HostGrant.

## Out of scope / observations
- API `events/bookings/payments/feedback/matching` modules + api-client event methods left dormant (unused). Backend teardown = later, needs DB backup + approval.
- Paid Tables show a price but have no checkout flow (pre-existing gap).
- Admin has no Tables oversight page (hosts self-manage). Possible follow-up.
