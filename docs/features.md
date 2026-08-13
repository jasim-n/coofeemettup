# Feature map (current product)

Living reference for **what each shipped feature does**, **where it lives**, and **structural rules**. Prefer this over Events-era `docs/architecture.md` when they disagree. Code and `schema.prisma` remain authoritative.

Last updated: 2026-08-13.

---

## Peer reviews & score-only profiles

### What it does

After a Table’s `startAt` has passed, the **host and every APPROVED guest** can rate every other participant (host ↔ guests and guest ↔ guest). Profiles (self and public) show **calculated scores only**. Individual review comments stay private to **admin moderation**.

### Not this feature

- `User.reliabilityScore` — Events no-show / search ranking; **do not** merge star ratings into it.
- Table status `COMPLETED` — reviews unlock on `startAt < now`, not on host `complete()`.
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
