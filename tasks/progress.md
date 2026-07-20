# Progress / Decisions / Gotchas (resume anchor)

## Session 2026-07-20 additions (all free, verified, pushed to jasim-n/coofeemettup)
Cancel/refund/waitlist (#50) · notifications (#49) · cafe CRUD + **map location picker** (admin) · admin dashboard + **§7 go/no-go gate** · **bold-&-social UI redesign** (new token system in globals.css; pill buttons + gradient `hero` variant; rounded-3xl cards; vibrant badges) · **event edit** (PATCH /events/:id, capacity-vs-claimed guard) · **one-off event location** (custom pin overrides cafe; map auto-fits all pins) · **Terms/Privacy** pages + footer · **payment receipts** (/receipt/[id]) · **referral/invite** (User.referralCode + referredByCode, /invite page, ?ref= capture; rewards deferred) · **group chat** (GroupMessage, members-only, 6s polling, block-filtered) · **mobile parity** (My Meetups + cancel + group block/report + Notifications in Expo app; bundles via expo export).
Verdict/gate thresholds, refund cutoff (24h), waitlist auto-promote — see below.
GOTCHA: fire-and-forget Prisma writes must await internally (lazy promises) — hardened NotificationsService.create like AuditService.log.

## STATUS: Phase 0 + 1 COMPLETE ✅ · Phase 2 matching engine COMPLETE ✅ — verified green + real-browser e2e
Phase 0: monorepo, NestJS API, Prisma 7, phone-OTP+CSRF auth, shared packages, Next.js web (Tailwind+shadcn), CI.
Phase 1: seed (admin+cafe+event), Events, Bookings+sandbox payment, Admin groups+attendance, Feedback, full web pages + admin console.
Phase 2 (matching): **Matching engine v1** — pure greedy partitioner implementing §10.4 (hard-filter, anchor by interest/lifeStage, sweet-spot fill, energy balance, newcomer spread, blocklist safety, no-odd-one-out scoring). `apps/api/src/matching/` — algorithm (unit-tested, 8 tests) + service + admin endpoints. Admin UI: **"Preview matches"** (shows proposed groups w/ score, member names, energy mix, newcomer count, odd-one-out warnings — not saved) + **"Auto-generate"** (commits) + match% badges. Live-verified (curl + browser `e2e/preview-check.mjs`).
Phase 2 (payments seam): **hosted-checkout + signed-webhook** model (`apps/api/src/payments/`). PaymentProvider abstract (createCheckout + verifyWebhook HMAC) with MockPaymentProvider; real PK gateway drops in by swapping the binding. Flow: POST /bookings/:id/pay → checkoutUrl → (mock) hosted page → POST /payments/webhook (signature-verified) → atomic seat-claim + PAID. Web redirects to checkout and back. Verified: webhook bad-sig→400, good→200; full browser e2e (redirect checkout) passes.
Phase 3 (mobile): **Expo app** (`apps/mobile`, SDK 57 / RN 0.86, blank-TS, free). Bearer-token auth (web stays cookie+CSRF; mobile uses `Authorization: Bearer`, CSRF skipped — SessionGuard/CsrfGuard accept both; verify-otp returns token only when `x-client:mobile`). Reuses `@jrst/api-client` in `clientType:'mobile'` mode; token in expo-secure-store. Screens: OTP login → events list → join+pay (opens hosted checkout via Linking) → **Profile** (edit firstName/lastInitial/city/interests/beverage) → **Feedback** (§13, pill/number/toggle controls) → **Map** (react-native-maps, Apple Maps on iOS, coral cafe pins + tap→meetups→join). Screen-router in App.tsx. Branded coral/cream StyleSheet + ☕ wordmark.
**Mobile map gotcha (IMPORTANT):** `expo-maps` needs a native **dev build**, which FAILS on this machine (Xcode 26.2 + Expo SDK 57 → Swift compile error in core `expo-modules-jsi`, `JavaScriptCodable+Date.swift:53` — not our code; blocks ALL native dev builds here). **Fix: `react-native-maps` is bundled in Expo Go** → runs with NO dev build, Apple Maps on iOS (no key/account). Verified live in the iOS simulator. (Caveat: a production/standalone build still needs the native build to succeed — toolchain fix or EAS later.) Metro monorepo config. Verified: bearer flow curl-tested; app typechecks; `expo export` bundles (585 modules). NOTE: device/simulator runtime walk is a follow-up (not runnable headless here).

Phase 4 (live map): **/map** page — MapLibre GL + OSM raster tiles (**no token/account/cost**, chosen over Mapbox). Cafe.lat/lng added (migration + seeded Islamabad coords). **One pin per cafe** (grouped; badge = # meetups) with a popup listing that cafe's meetups + join links; **15s polling** for live seats-left. Verified in browser (`e2e/map-check.mjs`): canvas + grouped marker + popup lists 6 meetups; screenshot `e2e/shots/06-map.png`. Import gotcha: react-map-gl's `Map` shadows global `Map` — alias to `MapGL`.
Root gates all pass: `pnpm typecheck` (5, incl. mobile) ✅ `pnpm lint` ✅ `pnpm test` (21) ✅ `pnpm build` ✅. Browser e2e `e2e/clickpath.mjs` PASSES (login→browse→join→hosted-pay→feedback→admin); `e2e/map-check.mjs` PASSES (4 pins).
Hardening: root **README.md** (setup/run/auth/gates/structure) · seed = **4 cafes w/ distinct coords** + open events (map shows spread pins) · payment webhook signature unit tests (6).
Safety flow (§6): report + block + unblock + list-blocks + **admin reports moderation** (`apps/api/src/safety/`). Matching honors `blockedUserIds`. Curl+e2e verified; `/admin/reports` renders.
**Audit / activity log** (`apps/api/src/audit/`): append-only `AuditLog` (actorId, action, targetType, targetId, meta JSON, createdAt). Global `AuditService.log()` (never throws) wired into: auth.login, booking.join, booking.paid, attendance.marked, group.created, event.created, user.reported, user.blocked, cnic.submitted, user.verified. Admin `GET /admin/audit` + `/admin/activity` feed page (branded). Curl + browser verified. Answers "do we log user actions?" → yes.
CNIC verification (manual, free — no NADRA/cloud): user uploads CNIC image (multer → local `uploads/cnic/`, gitignored, image-only, 5MB cap) → verificationStatus PENDING; admin `/admin/verifications` lists pending, streams the image (admin-gated), Approve/Reject → VERIFIED/REJECTED. `apps/api/src/verification/`. Endpoints below. Curl + browser verified (`e2e/cnic-check.mjs`).
Polish: **event filters** on /events (area + gender track → server-side browse re-query; verified `e2e/filter-check.mjs`) · **reliability score** shown on home + admin attendee list.
**Branding** (docs/brand.md): warm-coffee + coral identity via shadcn CSS vars in globals.css (whole app inherits) + Syne/Plus-Jakarta fonts + `Wordmark` + gradient hero on login/home + Syne headings + color-coded track badges + coral map pins. Fixed a latent bug: `--font-sans` was undefined (app was rendering in a serif fallback). **Map is now geolocation-based** (centers on the user's real location, fallback Islamabad). Verified via `e2e/brand-shots.mjs` (login/home/events/map screenshots).
User-facing safety loop: **My Meetups page** (`/meetups`) — user's bookings + per-event **group co-members** (privacy-safe: id/firstName/lastInitial/interests, NO phone via `GET /events/:id/my-group`) with **Block (1-click) + Report (reason prompt)**. Verified in browser (`e2e/meetups-check.mjs`, screenshot 08-meetups). Closes the earlier follow-up.
**Real browser click-path (Playwright) PASSED**: login(OTP) → browse → join → pay → feedback → admin console. Script: `e2e/clickpath.mjs` (reads OTP from Redis; screenshots in `e2e/shots/`). Run: `node e2e/clickpath.mjs` (needs API+web+DB up).

## Phase 1 API surface (all under /api, session+CSRF enforced on mutations)
- PATCH /users/me (profile intake §12)
- POST /events [ADMIN/ORGANIZER] · GET /events?area&genderTrack · GET /events/:id · GET /events/admin/all [admin]
- POST /events/:id/join · POST /bookings/:id/pay · GET /bookings/me
- GET /events/:id/bookings [admin] · POST /events/:id/groups [admin] · GET /events/:id/groups · POST /bookings/:id/attendance [admin]
- POST /events/:id/feedback · GET /events/:id/feedback/mine
- GET /events/:id/match/suggest [admin] (preview) · POST /events/:id/match/generate [admin] (persist greedy-v1)
- POST /bookings/:id/pay {returnUrl} → {checkoutUrl} (initiate hosted checkout) · POST /payments/webhook (public, HMAC-signed) · dev-only GET /payments/mock/pay + POST /payments/mock/complete
- Auth accepts BOTH: web httpOnly cookie+CSRF, and mobile `Authorization: Bearer <jwt>` (send `x-client:mobile` on verify-otp to receive the token; bearer requests skip CSRF).
- POST /users/:id/report {reason,eventId?} · POST /users/:id/block · DELETE /users/:id/block · GET /users/me/blocks · GET /admin/reports [admin]
- GET /bookings/me · GET /events/:eventId/my-group (privacy-safe co-members)
- POST /users/me/cnic (multipart) · GET /admin/verifications [admin] · GET /admin/verifications/:id/image [admin] · POST /users/:id/verify {approve} [admin]
- GET /admin/audit [admin] (activity log)
Seed admin phone: +923001112222 (dev OTP in API console). Sample cafe id: seed-cafe-f7. Sample event: seed-event-1.

## How to run (DB services already started via brew)
- API:  `pnpm --filter @jrst/api start`  (or `dev` for watch) → http://localhost:4000/api
- Web:  `pnpm --filter @jrst/web dev` → http://localhost:3000
- DB:   `pnpm --filter @jrst/api db:migrate` | `db:studio` (DB: `jrst_dev`, role `shahbaz`)
- Dev OTP is printed to the API console (no SMS yet).
- Verified live: OTP → session cookie → `/api/auth/me` → CSRF blocks mutation w/o header (403), allows w/ header (200). Web serves `/` and `/login`.

## What exists
- `apps/api` (NestJS 11): health, config(zod), Prisma(adapter-pg), Redis, Users, Auth (request-otp/verify-otp/me/logout), global guards CSRF→Session→Roles, decorators (@Public/@SkipCsrf/@Roles/@CurrentUser). Prisma schema has ALL Phase-1 models already (User, Cafe, Event w/ pricePKR, Booking, GroupAssignment, Feedback, Report) + enums. Migration `init` applied.
- `apps/web` (Next 16, React 19, Tailwind v4, shadcn base-nova): AuthProvider context, api singleton, `/login` OTP flow, `/` home. Null-safe `<Input>`.
- `packages/types` (enums + PublicUser + AuthResponse), `packages/api-client` (ApiClient + ApiError, CSRF-in-memory). Source-only, consumed via Next transpilePackages.
- `.github/workflows/ci.yml` (postgres+redis services, migrate deploy, typecheck/lint/test/build).

## Gotchas (do NOT re-derive)
- **Prisma 7**: no `url` in schema (P1012) → URL in `prisma.config.ts` (datasource.url) for CLI + `@prisma/adapter-pg` `new PrismaPg(url)` in PrismaService `super({adapter})`. Generator needs `moduleFormat="cjs"` + `importFileExtension=""` for NestJS CJS. Output `apps/api/generated/prisma` (gitignored). `prisma.config.ts` needs `import 'dotenv/config'`.
- **pnpm** allowBuilds (in pnpm-workspace.yaml): unrs-resolver, prisma, @prisma/client, @prisma/engines, sharp.
- **base-ui Button** (shadcn base-nova) has NO `asChild` → use `render` prop, or style `<Link>` with `buttonVariants({className})`.
- **React Compiler lint** `react-hooks/set-state-in-effect`: don't call setState directly in effect body; use async IIFE + `active` guard.
- **Express `req.cookies` is `any`** → cast `as Record<string,string|undefined>` to pass @typescript-eslint no-unsafe-assignment.
- **shadcn CLI**: `init -y -d --no-monorepo -c apps/web` (`-b`=base|radix, `-p`=preset base-nova). Adds @base-ui/react + lucide + tw-animate-css.
- **fetch binding**: storing `globalThis.fetch` on an instance field and calling `this.fetchImpl()` throws "Illegal invocation" — bind it: `globalThis.fetch.bind(globalThis)`. (Caught by the browser e2e; curl couldn't.)
- **Prisma 7 scalar lists**: pass arrays directly on create/update (e.g. `userIds`, `areas`) — no `{ set: [] }` needed.
- Pre-login `/auth/me` 401 shows in browser console — expected (signed-out bootstrap), handled by AuthProvider.
- **Helmet CSP `form-action 'self'`** blocks a form whose submission REDIRECTS cross-origin (mock checkout → web app). Fix: set a per-route CSP allowing `form-action 'self' <WEB_ORIGIN>` on the dev mock page (via @Res res.setHeader). Real gateways host their own page so this is dev-only.
- Prisma `migrate dev` refuses non-interactive shells — author the migration folder + migration.sql by hand, then `prisma migrate deploy`.
- Map: used **MapLibre GL + OSM tiles** (not Mapbox — no token). Multiple events at the same cafe stack pins at identical coords (future: cluster/offset). Map libs loaded client-only via `next/dynamic({ssr:false})`.
- Recurring shell gotcha: a `cd apps/api` in one Bash call persists cwd for later calls — use absolute paths (scripts writing relative paths land in the wrong dir).
- Expo monorepo: needs `metro.config.js` with `watchFolders=[repoRoot]` + `resolver.nodeModulesPaths=[app, root]` so Metro resolves + transpiles workspace TS packages. Verify headless with `expo export --platform ios` (bundles JS, no Xcode/simulator).
- **create-next-app** drops nested `pnpm-workspace.yaml` + `CLAUDE.md`/`AGENTS.md` → removed. Next 16 ships docs at `node_modules/next/dist/docs`.
- Bleeding-edge: TS7 (but NestJS pins TS 5.7, Next uses TS5), Next 16 (Turbopack), ESLint 9/10, Prisma 7.8, Turbo 2.10.

## Hosted infra (free, wired + verified)
- **DB: Neon** (hosted Postgres, free tier). Provision any DB: `DATABASE_URL=<url> prisma migrate deploy` then `db:seed`. All 5 migrations replay cleanly (why we keep every migration file).
- **Redis: Upstash** (hosted, TLS `rediss://`, free tier). ioredis handles `rediss://` automatically — no code change.
- App now runs against Neon + Upstash (only the API process is local). `apps/api/.env` keeps local Postgres/Redis URLs commented as fallback. Dev OTP is returned in the request-otp response (`devCode`) when NODE_ENV!=production + shown/prefilled on the web login.
- No code changes for hosting — just env swaps. Login/OTP/events verified end-to-end on hosted stack.

## Cancel / Refund / Waitlist (task #50) ✅ — 15/15 integration checks green
Booking lifecycle field added: `status BookingStatus{ACTIVE|WAITLISTED|CANCELLED}` + `cancelledAt`/`waitlistedAt` (migration `20260719120000_add_booking_status`, applied to Neon). **Cancel booking** (`POST /bookings/:id/cancel`): refund only if >24h before start (else CANCELLED, no refund — decision), releases seat, reopens FULL→OPEN, promotes earliest waitlister→ACTIVE + notifies "pay to claim" (seat NOT held). **Join FULL event → WAITLISTED** (can't pay until promoted). **Cancel event** (`POST /events/:id/cancel`, admin): refunds all paid, cancels all bookings, notifies everyone (always full refund — org-initiated). Refund seam added to PaymentProvider (`refund()`; mock no-op). Web: My-Meetups cancel + status badges, event-detail waitlist join + cancel, admin cancel-event button.

## Admin dashboard + Go/No-Go gate (task #52) ✅ — 11/11 metric checks green
`GET /admin/metrics` (`AdminService.getMetrics`) aggregates events (by status), bookings, attendance (show-rate), feedback (avg enjoyment/NPS/cafe, %come-again/%invite/%meet-again, felt-unsafe), and the **§7 Go/No-Go gate**: `GO` iff ≥40% of first-timers rebook (repeaters/first-timers where first-timer = ≥1 PAID+ACTIVE booking) **and** a referral signal (any inviteFriend=yes) **across ≥5 completed events**; else `NO_GO`; `INSUFFICIENT_DATA` when <5 held events. Type `DashboardMetrics`, client `adminMetrics()`. Web **`/admin/dashboard`** — verdict banner (green/red/muted) + repeat-rate/events-held/referral breakdown + metric cards; linked from /admin. Verified via seeded GO scenario (5 completed events, 2/4 repeaters, invite-a-friend feedback) with delta-based asserts.

## Cafe management (task #51) ✅ — 10/10 CRUD checks green
`apps/api/src/cafes/` — admin/organizer-gated CRUD (`GET/POST /cafes`, `PATCH/DELETE /cafes/:id`). List includes `_count.events`. Delete blocked (409) while a cafe has events (no orphaned bookings). lat/lng validated (±90/±180). Mutations audited (`cafe.created/updated/deleted`). Types: `CreateCafeInput`/`UpdateCafeInput` + `Cafe._count`. Client: `listCafes/createCafe/updateCafe/deleteCafe`. Web: **`/admin/cafes`** manage page (add/edit/delete, inline form) + admin event-create form now uses a **cafe dropdown** (was a raw "Cafe ID" text box) that also sets area. Verified via curl e2e (role-gate 403, validation 400, FK-guard 409, audit persistence).

## GOTCHA (root cause, fixed) — lazy Prisma promises + fire-and-forget
`void this.prisma.x.create(...)` **never executes** — Prisma promises are lazy (run only on `await`/`.then`). `AuditService.log` worked because it's `async` + awaits internally; `NotificationsService.create` returned a **bare** promise, so every `void notifications.create/notifyMany` silently no-op'd — meaning #49's `booking.paid`/`group.reveal`/`verification` notifications were never persisted. **Fix:** hardened `NotificationsService.create` to `async` + internal `await` + try/catch (mirrors `audit.log`), so fire-and-forget `void` callers now write and a notif hiccup can't break the request. Rule: any fire-and-forget service method wrapping a Prisma write MUST await internally.

## Decisions
Stack: NestJS + Next.js + Prisma 7 + pnpm/Turbo, Tailwind + shadcn/ui (NO DWTC). Mixed gender tracks. Per-event pricing. Build-first (concierge gate skipped). Public npm only.
Refund policy: 24h cutoff (full refund only if cancelled >24h before start; event cancellation always full refund). Waitlist: auto-promote earliest + notify to pay, seat not held.

## RESUME HERE → Phase 2 remaining (BLOCKED on user/external accounts — do NOT fake)
1. ~~Matching engine v1~~ ✅ DONE. Future: tune weights from feedback outcomes; add BullMQ if pools get large; matching-preview UI (show oddOneOut) in admin.
2. ~~Payment seam (mock)~~ ✅ DONE. **Real payments NEEDS USER**: pick PK gateway (Safepay/Paymob/Easypaisa/JazzCash/Raast) + sandbox creds → implement a real PaymentProvider (swap MockPaymentProvider in PaymentsModule; implement createCheckout against the gateway + verifyWebhook against their signature scheme). Everything else already wired.
3. **CNIC verification** — NEEDS USER: NADRA access is regulated; decide manual-review-first vs a KYC provider. Then image upload (S3/R2 encrypted) + review flow. verificationStatus defaults PENDING today.
4. **Real SMS OTP** — NEEDS USER: pick SMS provider; replace dev console OTP.
5. **Notifications** (WhatsApp/push).
~~Phase 4 (live map)~~ ✅ DONE (grouped pins + polling). ~~Phase 3 (mobile)~~ ✅ DONE (v1 — login/browse/join, bundles). Mobile follow-ups: run on a device/simulator; deep-link return after checkout; profile/feedback screens; point EXPO_PUBLIC_API_URL at a device-reachable host (localhost only works on iOS sim; Android emulator = 10.0.2.2).
Remaining, all NEEDS-USER (external accounts): real payment gateway, CNIC verification, real SMS OTP. Everything else (seams) is ready.
Plan: `tasks/2026-07-15-phase-0-1-build-plan.md`. Concept/§refs + matching rulebook: `tasks/2026-07-14-coffee-meetup-concept-design.md` (§10). Roadmap/spikes: `docs/architecture.md`.
