# Plan — Privacy identity model: public @handle, private real name, phone/email admin-only

> On approval, copy to `tasks/2026-08-12-privacy-identity.md` (house rule: plans live in `tasks/`).

## Context
Today a user's **phone number is the de-facto identity** — the API returns `phone` in the shared `PublicUser` shape, so it leaks to hosts, connected users, invitees, DM partners, search results, and connection suggestions. The web UI even prints `@{phone}` as the user's handle in 3 self-facing places. The user wants the opposite: **nobody should be able to obtain another person's real-world contact details from the app**, so people can only meet through the platform, not contact each other IRL.

**Decision (locked via Q&A):**
- **Public identity = a unique `@username` handle** the user chooses. Other members see ONLY the handle — never the real name, phone, or email.
- **Real name (first + last) is private** — visible only to the user themselves and to admins. When a user sets their name + handle, the UI tells them *"your handle is public; your name stays private."*
- **Phone**: never shown to other users; the owner can see/edit their own in account settings; admins keep full visibility.
- **Email**: same as phone — private (self + admin), and it stays the OTP login key.
- **Every account must have a distinct (unique) phone AND a distinct (unique) email** (both already `@unique`; we enforce email non-null + collect handle/name at signup).
- **A name is required** — new signups must provide first + last name + handle; existing users missing a name are gated to complete it on next login.

### Postmortem / why this is the right cut
- **Root cause is one field in one serializer.** `phone` (and `firstName`/`lastInitial`) live in `toPublicUser`, which ~9 endpoints reuse. Fixing the serializer + the `PublicUser` type fixes every leak at once — no per-endpoint shims (root-cause, per house rules).
- **Reuse the existing "self-only" pattern.** `email` is already typed `email?: string | null` and only populated by `toSelfUser`. We extend that exact pattern to `phone`, `firstName`, `lastName`, `lastInitial` — public callers get `undefined`, self/admin get real values. No new mechanism.
- **Tradeoff surfaced:** members at a table will see each other only by handle, not real name, until they meet IRL. That is the explicit intent (privacy over familiarity). Avatars derive initials from the handle so no name letter leaks.

## Data model (Prisma — `apps/api/prisma/schema.prisma:143-154`)
- Add `username String? @unique` → the public handle. (Nullable in step 1 so the backfill can run, then tightened to required.)
- Add `lastName String?` → private full last name (self/admin). Keep `firstName`; keep `lastInitial` (still handy for admin, but no longer a public identity).
- Keep `phone String @unique`, `email String? @unique`.
- **Migrations (house rule: migration files, never `db push`):**
  1. `add_username_lastname` — add both columns nullable.
  2. Backfill script `prisma/backfill-usernames.ts` (mirror existing `prisma/backfill-emails.ts`): generate a unique handle per existing user from email local-part / firstName, dedupe with numeric suffix.
  3. `username_required` — set `username` NOT NULL + `@unique`.
  4. (Optional, gated on a no-null check) `email_required` — verify zero null emails first, then NOT NULL. If any null emails exist, leave nullable and only enforce at signup.

## Backend
**Serializers — `apps/api/src/users/user.serializer.ts`:**
- `toPublicUser` (others): **remove** `phone`, `firstName`, `lastInitial`; **add** `username`. Keep non-contact profile fields (city, interests, occupation, photoUrl, online, etc.).
- `toSelfUser` (self): add `username`, `firstName`, `lastName`, `lastInitial`, `phone`, `email` (full identity).
- `toPublicProfile` (public /u/[id]): remove `firstName`, `lastInitial`; add `username`.
- Admin serializer / `AdminUserDto`: add `username`; keep `phone`, `email`, real name (unchanged visibility).

**Shared type — `packages/types/src/index.ts:107` (`PublicUser`):**
- Add `username: string`.
- Make `phone`, `firstName`, `lastInitial`, `lastName` **optional** (`?`) with a comment "self/admin only; omitted for other users" — same pattern as the existing `email?`.
- Add `username` to `PublicProfile` (line ~343) and `AdminUserDto` (line ~607).

**Signup — `apps/api/src/auth/auth.service.ts:27-55` + `dto/verify-otp.dto.ts`:**
- New users must supply `firstName`, `lastName`, `username` (like `phone` today). Add fields to `VerifyOtpDto` (optional in DTO, required-for-new-user in service).
- Validate handle format (`^[a-z0-9_]{3,20}$`) + uniqueness → `ConflictException('That handle is taken')`. Keep phone-conflict + add email uniqueness guard.
- Add `GET /users/username-available?u=` (live availability check for the signup/profile UI).

**Endpoints auto-fixed by the serializer change (no per-file edits needed, verify each):** `tables.service.ts:483,500` · `connections.service.ts:113,132,158` · `users.service.ts:50` (search) · `invites.service.ts:95,130` · `dm.service.ts:86`.

## Frontend
**Remove phone from the 3 self-facing spots (show handle/name instead):**
- `apps/web/src/app/page.tsx:145` (mobile hero) → greeting with firstName.
- `apps/web/src/app/profile/page.tsx:359,521` → `displayName = firstName + lastName`; handle line `@{username}` (was `@{phone}`).
- `apps/web/src/components/desktop-nav.tsx:174` → name + `@{username}` (was `@{phone}`).

**Switch every OTHER-user display from real name → `@handle`:**
- Public profile `apps/web/src/app/u/[id]/page.tsx:141-142,182` → show `@username` (not firstName + lastInitial).
- Table host + participants `apps/web/src/app/tables/[id]/page.tsx:292-295,454` → `@username`.
- Any card/list rendering `firstName`/`lastInitial` for other users (Explore/Home/Meetups cards, connections, invites, DM threads, search) → `@username`. Pattern: replace `firstName + lastInitial` with `@username`.
- `apps/web/src/components/avatar.tsx` (`initialsOf`) → derive initials from `username` for other users so no name letter leaks. Self-facing avatars may keep name initials.
- Admin pages (`admin/users`, `admin/verifications`, `admin/reports`, `admin/tables` participants) → **keep** real name + phone (admin scope). Add handle where useful.

**Signup name + handle step — `apps/web/src/app/login/page.tsx`:**
- For `isNewUser`, add inputs: First name, Last name, Handle (@username, with live availability + format hint) alongside the existing phone step.
- Helper copy: *"Your @handle is public. Your name, phone and email stay private."*

**Profile edit — `apps/web/src/app/profile/page.tsx`:**
- Add editable First/Last name + Handle (uniqueness-checked); show own phone/email in an account/settings area (self-only, per decision). Remove all `@phone` usage. Null-safe inputs per house rule (coalesce null→"").

**Complete-profile gate:** on login, if `firstName`/`lastName`/`username` missing → route to the name+handle step before continuing (existing users get handle via backfill, so the gate mostly enforces name).

## Privacy sweep (verification greps — must return clean)
- `grep -rn "phone" apps/web/src/app` → only admin pages render phone.
- `grep -rnE "firstName|lastInitial" apps/web/src` for OTHER-user contexts → replaced by `username`.
- `grep -rn "toPublicUser" apps/api/src` → confirm none of those responses now carry phone/name.
- Confirm no `firstName`/`phone` embedded in notification/chat/DM message text (already verified clean).

## Verification (end-to-end)
1. Build types → api-client → api; `tsc --noEmit` web; eslint changed files.
2. Migrations + backfill locally against Neon (migration files, not `db push`); `prisma migrate status` clean; spot-check backfilled handles are unique.
3. Boot compiled API; via mobile-header flow: sign up a NEW user (name + handle + phone + email) → assert success; retry duplicate handle → 409; duplicate phone → 409; duplicate email → 409.
4. As user A, fetch user B via search / connections / invite / DM / table host + participants → assert response contains `username`, and **no** `phone`, `firstName`, `lastName`, `email`.
5. As the same user, `/auth/me` (self) → assert it DOES include own phone/email/name.
6. As admin, `/admin/users` → assert phone + real name still present.
7. Browser click-path (local then deployed): public profile shows @handle only; table cards/host show @handle; own profile + nav show name + @handle, no phone; account settings shows own phone; admin pages show phone + name. Signup shows the "handle is public, name private" copy.
8. Commit as `jasim-n`; update `CHANGELOG.md`; push (CI/CD deploys — never deploy by CLI).

## Out of scope
- Changing the OTP/login mechanism (still email-OTP). Handle change rate-limiting/history. Reserved-handle blocklist beyond basic format/uniqueness. Backfilling real names for existing users (can't invent them — gated on next login instead).
