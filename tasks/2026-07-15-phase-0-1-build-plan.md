# Plan — Phase 0 (Foundations) + Phase 1 (Walking Skeleton, Web)

> On approval, this plan is copied to `tasks/2026-07-15-phase-0-1-build-plan.md` (house rule: plans live in `tasks/`). Plan-mode requires it be authored here first.

## Context
Greenfield build of the coffee-meetup product (concept + architecture already designed in `docs/`). Decisions locked: **Next.js web first · dedicated NestJS API · PostgreSQL/Prisma · pnpm+Turborepo monorepo · mixed gender tracks at launch · per-event pricing · full product as the phased target.** This plan delivers only **Phase 0 (foundations)** + **Phase 1 (one working end-to-end web slice)**. It stops well short of the full product on purpose — real payments, CNIC verification, the matching engine, mobile, and the map are later phases. Goal: from empty folder → a running web app where an organizer creates a priced event, a user joins + "pays" (sandbox), an admin forms a group, and attendees leave feedback.

## Environment prerequisites (gaps found on this machine)
- ✅ Node v24.16.0, npm 11.13.0, git 2.50.1
- ⚠️ **pnpm missing** → enable via `corepack enable pnpm` (bundled with Node 24; no global install).
- ⚠️ **Docker & local Postgres missing** → need Postgres 16 + Redis for dev. **Prereq decision** (Task 0.0): (a) Docker Desktop + `docker-compose.yml` [recommended, reproducible], (b) Homebrew `postgresql@16` + `redis`, or (c) cloud dev (Neon + Upstash). Recommend (a); requires a one-time Docker Desktop install by you.
- Exact package versions pinned from the npm registry **at scaffold time** via the official `create-*`/`nest`/`prisma` CLIs — not hardcoded from memory.

## Scope
- **What:** monorepo + NestJS API + Next.js web + Postgres/Prisma + phone-OTP auth (CSRF double-submit) + one vertical feature slice + CI.
- **Why:** establish the real foundation the whole product builds on, and prove the core flow works end-to-end before layering features.
- **Impact:** creates the entire initial codebase; no existing code affected (greenfield).

## Success criteria (measurable)
- [ ] `pnpm install && pnpm build && pnpm lint && pnpm test` all green from repo root (Turborepo).
- [ ] `pnpm dev` boots API (NestJS) + web (Next.js) together; Postgres + Redis reachable.
- [ ] User signs up with phone → receives OTP (dev: logged to console) → authenticated session (cookie) with CSRF enforced on mutations.
- [ ] Organizer (admin role) creates an Event with `pricePKR`, area, gender track, capacity, start time.
- [ ] User browses open events, joins one, completes sandbox payment → Booking = paid, seatsLeft decrements.
- [ ] Admin forms a group for an event (manual assignment) → GroupAssignment persisted.
- [ ] After event, attendee submits the §13 feedback form → stored, linked to user+event.
- [ ] CI (GitHub Actions) runs install/build/lint/test on push.

## Out of scope (later phases — do NOT build now)
Real payment gateway (Safepay/Paymob/Easypaisa/JazzCash/Raast — Phase 2 after spike) · CNIC verification flow (Phase 2; Phase 1 only stores `verificationStatus` enum, default `PENDING`) · automated matching engine v1 (Phase 2; Phase 1 = manual admin assignment) · reliability score algorithm · WhatsApp/push notifications · RN mobile app (Phase 3) · live map + re-pairing + themed events (Phase 4) · production deploy.

## Token budget
Est. ~120–180k across Phase 0+1 implementation / 1M context window. Checkpoint to `tasks/*-checkpoint.md` at ~90%.

## Monorepo layout (target)
```
/ (pnpm workspace + turbo.json)
├─ apps/
│  ├─ api/        NestJS (auth, events, bookings, payments, feedback, admin)
│  └─ web/        Next.js App Router (marketing + app + admin console)
├─ packages/
│  ├─ types/      shared DTOs / enums (GenderTrack, roles, statuses)
│  ├─ api-client/ typed client used by web (+ later mobile); attaches CSRF header
│  └─ config/     shared tsconfig, eslint, prettier
├─ docker-compose.yml   (postgres:16, redis:7)
└─ .github/workflows/ci.yml
```

## Implementation tasks

### Phase 0 — Foundations
- **0.0 Prereq decision** — choose dev DB approach (Docker recommended); install Docker Desktop if so.
- **0.1 Repo + tooling** — `git init`; pnpm workspace (`pnpm-workspace.yaml`), `turbo.json`, root `package.json` scripts (dev/build/lint/test/typecheck); shared `packages/config` (tsconfig base, eslint flat config, prettier); `.gitignore`, `.env.example`, `.nvmrc`.
- **0.2 Local infra** — `docker-compose.yml` for `postgres:16` + `redis:7`; documented `pnpm db:up`.
- **0.3 API skeleton** — `apps/api` via Nest CLI; config module (`@nestjs/config`, zod-validated env); health endpoint; Prisma (`apps/api/prisma/schema.prisma`) + `prisma migrate dev` wired; global validation pipe; helmet/CORS; cookie parser.
- **0.4 CSRF + session** — double-submit-cookie CSRF (per house rule): server issues CSRF cookie + token on session bootstrap; guard enforces header==cookie on POST/PATCH/PUT/DELETE; GET/HEAD/OPTIONS exempt. JWT/session cookie (httpOnly) for auth.
- **0.5 Auth (phone OTP)** — request-OTP + verify-OTP endpoints; OTP stored in Redis w/ TTL + throttle; **dev delivery = console log** (real SMS provider later); on verify → session cookie + CSRF token; `User` created/fetched; roles enum (`USER`/`ORGANIZER`/`ADMIN`).
- **0.6 Shared packages** — `packages/types` (enums + DTO types); `packages/api-client` (fetch wrapper: `credentials:'include'`, bootstraps session, attaches CSRF header on mutations, surfaces errors — never swallows).
- **0.7 Web skeleton** — `apps/web` via `create-next-app` (App Router, TS); **Tailwind + shadcn/ui** (NOT DWTC / no org design system); wire `api-client`; null-safe shared `<Input>/<Textarea>` (coalesce null→""); auth context; protected route wrapper. No hardcoded colors/spacing — use Tailwind theme tokens. Optionally `ui-ux-pro-max` for design intelligence.
- **0.8 CI** — `.github/workflows/ci.yml`: pnpm install (frozen) → build → lint → typecheck → test, with turbo cache. Deploy is CI/CD-only, not in this plan.

### Phase 1 — Walking skeleton (web slice)
- **1.1 Domain models (Prisma)** — `User` (§12 profile fields, `verificationStatus PENDING`, `role`, `reliabilityScore` default), `Cafe`, `Event` (`cafeId`, `startAt`, `genderTrack`, `area`, `capacity`, **`pricePKR`**, `seatsLeft`, `status`), `Booking` (`userId`,`eventId`,`paymentStatus`,`attendanceStatus`), `GroupAssignment` (`eventId`,`userIds[]`,`algoVersion='manual'`), `Feedback` (§13 answers). Migration diff shown + approved before apply (house rule).
- **1.2 Events API** — organizer create/list/get events; public list of OPEN events filtered by area/track; seat accounting.
- **1.3 Bookings + sandbox payment** — join event → create Booking(PENDING); `PaymentProvider` interface with a **SandboxProvider** (mark-paid) so the real gateway drops in later; on paid → seatsLeft--, Booking=PAID; guard against overbooking (transaction).
- **1.4 Admin group assignment (manual)** — admin view of an event's paid bookings → select users → create GroupAssignment. (This is the human version of the §10.4 rulebook; the algorithm is Phase 2.)
- **1.5 Feedback** — post-event form endpoint + web page implementing §13 questions; store per user+event; no-show/attendance set by admin.
- **1.6 Web pages** (UI gate applies to each) — auth/OTP, profile (intake §12), browse events, event detail + join/pay, admin console (create event, view bookings, form group, mark attendance), feedback form.

## Verification (end-to-end)
1. `pnpm db:up && pnpm dev` → API + web boot; `/health` OK.
2. Sign up via phone → grab OTP from API console log → verify → land authenticated; confirm CSRF cookie+header present on a mutation (DevTools).
3. As ADMIN (seed one), create an event with a price; confirm it appears in public browse.
4. As USER, join → sandbox pay → Booking PAID, seatsLeft decremented; retry overbook → rejected.
5. As ADMIN, form a group from paid bookings → GroupAssignment persisted.
6. Submit feedback → row stored linked to user+event.
7. Root `pnpm build && pnpm lint && pnpm typecheck && pnpm test` green; push → CI green.
8. `curl` a mutation without CSRF header → 403; with cookie+header → 2xx (house-rule CSRF check).

## Gates honored during implementation
- `implementation-verifier` PASS before code touching auth/DB/types/contracts.
- Tailwind + shadcn/ui for UI (NO DWTC / no org design system); optional `ui-ux-advisor` review before UI done.
- All packages from public npm (registry.npmjs.org); no org/DWTC scoped packages or registries. Prisma pinned at 7.8.0.
- Prisma: show migration diff, flag destructive, wait for approval; no resets.
- One reviewer scaled to risk before "done"; `code-reviewer` before any merge/PR (auth+payments = sensitive).
- Never deploy from CLI — CI/CD only. Commit only when you ask.
