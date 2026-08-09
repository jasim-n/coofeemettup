# Plan — Popular-cities cleanup · Profile-pic upload · Admin panel

_Drafted 2026-08-09 from a read-only code investigation (no assumptions). File:line refs are current._

## 1. Remove "View all" on Popular cities — DONE
`apps/web/src/app/discover/page.tsx:696` was an inert `<span>View all</span>` (not a link). Removed.
(Related, not in scope: the "View all" links on Top categories / Recommended / Trending all point to `/discover` itself — self-referential no-ops. Flag only.)

## 2. Profile-picture upload

**Where it goes:** the profile hero already has a camera button at `profile/page.tsx:541-547` — but it's **inert** (no onClick/handler). Wire *that* (no new UI design needed).

**Current state:** `photoUrl` exists on User but **no API writes it** — `UpdateProfileDto` omits it; it's only set by seed. File-upload infra exists but is CNIC-only (`verification.controller.ts` — multer `diskStorage` → local `uploads/cnic/`).

**Storage decision (important):** Render's local disk is **ephemeral** — files vanish on redeploy. So local diskStorage (what CNIC uses) is wrong for persistent profile pics. Use a free external store:
- **Recommended: Cloudinary (free)** — receive the multipart in NestJS (reuse the existing multer `FileInterceptor` pattern), upload to Cloudinary via one REST `fetch`, store the returned CDN URL in `User.photoUrl`. Gives CDN + free thumbnail transforms. Needs a free Cloudinary account → env `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` (like the email creds).
- Alt: **Vercel Blob** (free 500 MB) — upload from the Next.js side, then PATCH photoUrl.

**Build steps:**
1. API: `POST /users/me/photo` (auth) — `FileInterceptor('file')`, validate image + ≤5 MB, upload to Cloudinary, `prisma.user.update({ photoUrl })`, return `{ photoUrl }`. New `MediaService` wrapping the Cloudinary upload (env-driven; clear error if unset).
2. Contract: `api.uploadPhoto(file)`; no type change (photoUrl already on PublicUser).
3. Web: wire `profile/page.tsx:541-547` camera button → hidden `<input type=file accept=image/*>` (ref) → `handlePhotoUpload` → `api.uploadPhoto` → `refresh()`. Mirror the existing `handleCnic` pattern (`profile/page.tsx:415-426`).
4. Needs: a free Cloudinary account + 3 env vars (I'll wire once provided; no dev fallback — uploads require the store).

## 3. Admin panel — "all actionable + user-revoke features"

**Already exists** (endpoints + UI): host grant/revoke (by phone), cancel table, list all tables, verifications approve/reject, reports list (read-only), cafes CRUD, metrics dashboard, audit log. Admin gated server-side by `RolesGuard` + `@Roles('ADMIN','ORGANIZER')`; web pages do a client-side role check only.

**Core gaps for "user-revoke / moderation"** (from the gap analysis):
- No **user directory** (list/search users) — admin can't find a user to act on.
- No **ban/suspend** — there's no `User.status` field or enforcement, so a user can't actually be revoked access.
- No **role change**, no **revoke host by id** (only by phone), no **revoke verification**.
- Reports are **read-only** — no resolve/action (no `Report.status` field), no "ban the subject".
- No table **participant** view/remove; events endpoints exist but have **no UI**.

### Phase A — user revocation core (the heart of the request)
1. **Schema (additive):** `User.status  UserStatus @default(ACTIVE)` enum `ACTIVE|SUSPENDED|BANNED`; `Report.status ReportStatus @default(OPEN)` enum `OPEN|RESOLVED|ACTIONED` + `resolvedAt`. Migration (additive, safe).
2. **Enforce revocation:** in `SessionGuard`, reject `BANNED`/`SUSPENDED` users (401/403 with a clear message) so a ban actually cuts access.
3. **Admin API (new, all `@Roles('ADMIN','ORGANIZER')` in `admin.controller`):**
   - `GET /admin/users?q=` — paginated list/search (name/email/phone) with role, status, canHost, verification, counts.
   - `POST /admin/users/:id/status {status}` — ban/suspend/reactivate (+ audit log).
   - `POST /admin/users/:id/role {role}` — change role.
   - `POST /admin/users/:id/host {canHost}` — revoke/grant host by id (endpoint exists; expose by-id).
   - `POST /admin/users/:id/revoke-verification` — VERIFIED → PENDING.
   - `PATCH /admin/reports/:id {status}` — resolve/action a report; optional `banSubject`.
4. **Admin Users page** (`/admin/users`, new) — searchable table; row actions: Ban/Suspend/Reactivate, Change role, Grant/Revoke host, Revoke verification, View profile. Confirm dialogs on destructive actions.
5. **Reports page** — add Resolve / Actioned buttons + "Ban subject" shortcut (wire to the new endpoints).
6. **Admin nav** — add "Users" to the admin hub + a shared admin layout that also does a server-side/redirect guard (currently client-only).

### Phase B — content/table moderation (secondary)
- `GET /admin/tables/:id/participants` + `DELETE …/participants/:userId` (remove a guest) + hard-delete/hide table.
- Events admin UI (endpoints already exist: list/create/edit/cancel, bookings, attendance, groups).
- Review/DM/chat deletion endpoints + admin moderation (only if needed).

**Notes / safety:** all new mutations audit-logged; destructive actions confirm-gated; ban enforcement must not lock out the last admin (guard against self-ban / require ≥1 admin). Schema changes are additive (no data loss).

## Suggested order
1. (done) View-all removal.
2. Profile-pic upload (small; needs Cloudinary creds).
3. Admin Phase A (user directory + ban/suspend + role/host/verification + report actions) — the bulk of "actionable + revoke".
4. Admin Phase B (content/table/events moderation) as follow-up.
