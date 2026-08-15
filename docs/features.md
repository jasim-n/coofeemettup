# Feature map (current product)

Living reference for **what each shipped feature does**, **where it lives**, and **structural rules**. Prefer this over Events-era `docs/architecture.md` when they disagree. Code and `schema.prisma` remain authoritative.

Last updated: 2026-08-15.

---

## Tables list cache (Redis + UI)

### Backend (Redis)

| Key | Contents | TTL |
|-----|----------|-----|
| `cache:tables:browse:open` | Shared OPEN tables (+ cafe/host), no per-user fields | 60s |
| `cache:tables:mine:joined:{userId}` | Viewer joined list | 45s |
| `cache:tables:mine:hosting:{userId}` | Viewer hosted list | 45s |
| `cache:tables:mine:saved:{userId}` | Viewer saved list | 45s |

Browse overlays (`saved`, `myRequestStatus`, `myInvite`) stay live per request.

Mutations invalidate the affected keys (create/update/complete/approve/leave/
remove/save/invite-accept/admin cancel·delete). Safety TTL still expires keys.

### Admin invalidation API

| Method | Path | Body |
|--------|------|------|
| `POST` | `/admin/cache/invalidate` | `{ scope: 'all' \| 'tables' \| 'tables:browse' \| 'tables:mine', userId? }` |
| `DELETE` | `/admin/cache` | flush all table caches |

### UI

Module-level SWR (`apps/web/src/lib/data-cache.ts`) on Discover, Meetups, home,
Nearby, Search, Calendar, Saved, Invites, Profile, and the tables map.
`invalidateTablesClientCache()` after list-affecting mutations.

### Files

| Piece | Path |
|-------|------|
| Cache service | `apps/api/src/redis/cache.service.ts` |
| Wiring | `TablesService` / `InvitesService` / `AdminService` |
| Client SWR | `apps/web/src/lib/data-cache.ts` |

---

## Member profiles (admin-only)

Other members' public profiles (`/u/[id]`, `GET /users/:id/profile`) are
**admin / organizer only**. Members may still open their own `/profile` (and
`/u/:selfId`). `UserLink` does not navigate for non-admins. Connect and Message
on `/u/[id]` are admin-only.

---

## Account lock (admin Suspend / Ban)

### What it does

Admins lock accounts from `/admin/users` via **Suspend** (`SUSPENDED`) or **Ban** (`BANNED`). Locked users cannot obtain a session or call authenticated APIs (including chats and DMs).

### Enforcement (no workaround)

| Gate | Behavior |
|------|----------|
| Password login | Rejected with banned/suspended message |
| OTP request / verify → session | Blocked for non-`ACTIVE` |
| Password reset request | Silent no-op (no code) for locked accounts |
| Password reset → session | Blocked |
| Every authenticated request | `SessionGuard` re-checks DB `status` (stale JWT useless) |
| Web `/auth/me` 401 | Clears `jrst_token` from localStorage |

Reactivate only by setting status back to `ACTIVE` in admin.

### Files

| Piece | Path |
|-------|------|
| Admin UI | `apps/web/src/app/admin/users/page.tsx` |
| Status API | `AdminService.setUserStatus` |
| Auth seal | `apps/api/src/auth/auth.service.ts` |
| Request gate | `apps/api/src/auth/guards/session.guard.ts` |

---

## Table group chat close + remove participant

### Chat close rules

| Trigger | Effect |
|---------|--------|
| Auto | `completedAt + 24h` → chat closed (checked on read/write; no cron) |
| Host | `POST /tables/:id/chat/close` sets `chatClosedAt` |
| Admin | `POST /admin/tables/:id/chat/close` |

Closed = no new messages or reactions; history remains readable for members.

### Remove participant

| Actor | Endpoint |
|-------|----------|
| Host | `DELETE /tables/:id/participants/:userId` |
| Admin | `DELETE /admin/tables/:id/participants/:userId` |

Cancels the join request; if was `APPROVED`, restores a seat (`seatsLeft++`, `FULL`→`OPEN` when needed). Cannot remove the host.

### Files

| Piece | Path |
|-------|------|
| Service | `TablesService.closeChat` / `removeParticipant` / `getChat` |
| Host UI | Table detail Guests list; chat page Close chat |
| Admin UI | `/admin/tables` Close chat + Manage remove |
| Migration | `chatClosedAt` on `Table` |

---

## Maps (English + Pakistan-only)

### Rules

| Concern | Implementation |
|---------|----------------|
| English basemap | OpenFreeMap Liberty (`MAP_STYLE_EN`) — free MapLibre style, Latin/English-oriented labels |
| View lock | `maxBounds` ≈ Pakistan on LocationPicker, Nearby `TablesMap`, Search mini-map |
| Pin / click | Ignored outside Pakistan |
| Place search | Photon `lang=en` + Pakistan `bbox`; drop non-PK / out-of-bbox hits |

Shared: `apps/web/src/lib/map-style.ts`. Geocode: `apps/api/src/geo/geo.controller.ts`.

---

## My Meetups visibility

### Rule

**My Meetups** lists tables the viewer hosts **or** has joined (`APPROVED` / `PENDING`), until the table is **closed** (`CANCELLED` or `COMPLETED`). Passing `startAt` alone does **not** remove them.

**Past** lists `COMPLETED` hosted/joined tables only.

| Surface | Include |
|---------|---------|
| My Meetups | host ∪ join, status ∉ {CANCELLED, COMPLETED} |
| Past | host ∪ join, status = COMPLETED |

UI: `/meetups` (`activeJoined` / `pastJoined` in `apps/web/src/app/meetups/page.tsx`).

---

## Invite people (Table host)

### What it does

Hosts invite members from the table detail page. The picker stays **empty** until the host searches; there is no pre-populated connections or suggested-users list.

### Rules

| Rule | Detail |
|------|--------|
| Query | `@username` only (optional leading `@`; min 2 chars) |
| No match on | email, phone, real name, occupation |
| Empty state | Dashed empty container until a handle search runs |
| API | `GET /users/search` → `UsersService.searchUsers` (username `contains`, case-insensitive) |
| UI | `/tables/[id]` host “Invite people” section |

---

## Multi-category pills (Tables)

### What it does

Tables store categories as one comma-separated `category` string (preset chips + custom text on create/edit). On the user-facing UI each part is shown as its **own pill**, not one bundled tag.

### Wiring

| Piece | Path |
|-------|------|
| Split helper | `splitCategories()` in `apps/web/src/lib/category-icon.ts` |
| Pill UI | `apps/web/src/components/category-pills.tsx` (`CategoryPills`) |
| Surfaces | Table detail, Discover, home, Meetups, Nearby, Saved, Invites, Search, Calendar |

Filters that pick a single vibe match **any** split part of a table’s category. Tight cards may show `max` pills plus `+N`.

**No DB migration** — storage format unchanged.

---

## Venue search + pin map (create / edit Table)

### What it does

On create (`/tables/new`) and edit (`/tables/[id]/edit`), hosts search a place, auto-fill venue name/address/coordinates, and see a MapLibre pin they can adjust. Admin cafe create uses the same picker.

### Flow

1. `VenueSearch` → debounced `api.geocode` → Photon proxy `GET /geocode` (auth required).
2. On select: form sets `venueName`, `venueAddress`, `lat`, `lng`.
3. `LocationPicker` shows OSM map + draggable pin; click/drag updates `lat`/`lng`.
4. When `lat`/`lng` change (including after search): the **pin Marker is placed at those coords** (remounted by key) and the camera **flies** there. Selecting a search result also scrolls the picker into view.

### Files

| Piece | Path |
|-------|------|
| Search UI | `apps/web/src/components/venue-search.tsx` |
| Map pin UI | `apps/web/src/components/location-picker.tsx` |
| Create / edit pages | `apps/web/src/app/tables/new/page.tsx`, `.../tables/[id]/edit/page.tsx` |
| Geo API | `apps/api/src/geo/` |
| Nearby browse map (different) | `apps/web/src/components/tables-map.tsx` — do not reuse for the form |

### Edge cases

| Case | Behavior |
|------|----------|
| No pin yet | Map centered on Islamabad fallback; helper invites search or tap |
| Search select far from current view | Camera flies to new coords at zoom 14 |
| Manual drag / click | Pin + coords update; camera recenters to new point |
| Submit without lat/lng | Form error: drop a pin |

**No DB migration** for this UX fix.

---

## Peer reviews & score-only profiles

### What it does

After a Table’s `startAt` has passed, the **host and every APPROVED guest** can rate every other participant (host ↔ guests and guest ↔ guest). Profiles (self and public) show **calculated scores only**. Individual review comments stay private to **admin moderation**.

### Score formula

| Field | Meaning |
|-------|---------|
| `overallRating` | **50%** avg of reviews **written by** that table’s **host** + **50%** avg of reviews **written by guests who submitted**. Missing guest reviews are **not** counted (3 of 4 submitted → divide by 3). If only one side exists, use that side at 100%. `count` = total submitted reviews. |
| `hostRating` | Avg while subject was table host (role=`HOST`) |
| `guestRating` | Avg while subject was approved guest (role=`GUEST`) |

### Review window

| Who | Opens | Closes |
|-----|-------|--------|
| Guests | After `startAt` | **2 days after** host ends meetup (`completedAt` + 2d) |
| Host | After `startAt` | **Never** — host is required to review |

`Table.completedAt` is set when the host ends the meetup. Guests see `closed` / `closesAt` on review-targets.

### Join vs reviewed tracking (no “5 reviewed tables” gate)

There is **no** Tables-era “must have 5 reviewed events” check in product code today (the old admin “≥5 events” metric is dormant Events go/no-go only).

What **is** tracked in DB (derivable, no extra table):

| Fact | Source |
|------|--------|
| Joined a table | `TableJoinRequest` (`APPROVED` / etc.) |
| Reviewed someone on a table | `Review` (`tableId`, `reviewerId`, `subjectId`) |
| Tables fully reviewed by you | Tables where you have a `Review` row for every other participant |

Joined 7 / reviewed 4 → those are different counts; do **not** treat join count as review count.

### UI visibility

| Viewer / subject | Shown |
|------------------|--------|
| Non-host (`canHost=false`) self or public profile | **Overall only** |
| Host (`canHost=true`) | Overall + as-host / as-guest pills |

### Not this feature

- `User.reliabilityScore` — Events no-show / search ranking; **do not** merge star ratings into it.
- Table status `COMPLETED` — guest review **window** starts at host `complete()`
  (`completedAt`); reviews are also allowed after `startAt` before complete.
  Guest window ends `completedAt + 2 days`. Host never closes.
- Paid-Table checkout — unrelated.

### Data / schema

| Piece | Detail |
|-------|--------|
| Model | `Review` (`apps/api/prisma/schema.prisma`) |
| Migration | `20260726160000_reviews` (original); **2026-08-13 peer work: no new migration** |
| Uniqueness | `@@unique([tableId, reviewerId, subjectId])` — any participant pair, including guest↔guest |
| Role | `ReviewRole` = capacity of the **subject** (`HOST` if subject is table host, else `GUEST`) |
| Scores | On-read aggregates only — no stored overall-score column |

### API surface (unchanged routes)

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/tables/:id/review-targets` | Participants except self; `eligible`/`happened` = `startAt < now` |
| `POST` | `/tables/:id/reviews` | Upsert review; both parties must be participants |
| `GET` | `/users/me/reviews` | Reputation: `overallRating`, `hostRating`, `guestRating`, `recent: []` |
| `GET` | `/users/:id/reviews` | Same shape (public scores) |
| `GET` | `/admin/reviews` | Full rows with comments (moderation) |
| `DELETE` | `/admin/reviews/:id` | Admin delete |

Implementation: `apps/api/src/reviews/` (`ReviewsService.targets` / `create` / `reputation`). Admin listing stays in `admin.service.ts`.

Contracts: `UserReputation`, `ReviewTarget`, … in `packages/types`. Client: `tableReviewTargets`, `createReview`, `myReviews`, `userReviews` in `@jrst/api-client` (no new method names).

### Web UI wiring

| UI | Route / mount | Client calls |
|----|---------------|--------------|
| Leave reviews | `/tables/[id]` → `<TableReviews />` | `tableReviewTargets`, `createReview` |
| Own scores | `/profile` → `<MyReviews />` (+ overview rating number) | `myReviews` |
| Public scores | `/u/[id]` | `userReviews` |
| Host score chip | `/tables/[id]` host row | `userReviews(hostId)` → prefer `overallRating` |
| Moderation | `/admin/reviews` | `adminListReviews`, `adminDeleteReview` |

Leave-review UI maps API `targets` (no host hard-code). Copy: “Rate people who attended”.

### Edge cases (enforced)

| Case | Behavior |
|------|----------|
| Before `startAt` | Targets: `eligible: false`; create: 400 |
| Not host / not APPROVED | Empty targets; create: 403 |
| Subject not a participant (PENDING/left/outsider) | Create: 400 |
| Self-review | Create: 400 |
| Already reviewed | Target shows `alreadyReviewed`; create **upserts** (edit allowed) |
| Host alone (no guests) | Targets empty → UI hidden after happened |
| Cancelled table after start | Still reviewable if `startAt` passed and parties were participants (no COMPLETED gate) |
| Public/self profile | Never loads individual comments (`recent` always `[]`) |
| Notification | Score-updated copy only — does not imply opening review text |

Tests: `apps/api/src/reviews/reviews.service.spec.ts`.

### Structural decisions to keep

1. **Extend** `ReviewsService` — do not add a second review module/table.
2. **Privacy at reputation serializer** — strip text on user endpoints; admin path unchanged.
3. **No DB change** for peer/score-only unless a later requirement forces a stored column.
4. **Reuse** existing unique key for guest↔guest rows.

---

## How to add entries here

When a feature ships or changes structure, add a section with: purpose, schema/migration note, API routes, UI mounts, edge cases, and “not this feature” boundaries. Point `CHANGELOG.md` at the product note; keep durable wiring here.
