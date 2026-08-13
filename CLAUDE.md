# Coffee Meetups — Project Guide

## Working scope

This repository contains API, web, mobile, and shared packages. Unless a task explicitly says otherwise:

- Focus on `apps/web`, `apps/api`, `packages/types`, and `packages/api-client`.
- Ignore `apps/mobile`; do not edit, test, or include it in implementation plans.
- Preserve unrelated working-tree changes. Never discard or rewrite existing user work.
- Treat the current code as the source of truth. Some older files in `README.md`, `docs/`, and `tasks/` still describe the retired Events-first web experience.

## Product summary

Coffee Meetups is a Pakistan-focused social platform for small, in-person gatherings at public cafes. A host creates a limited-seat **Table**, people discover it and request to join, and the host approves or declines each request. Approved members can use a shared group chat and review one another after the meetup.

The current web product is **Tables-first**:

1. A user signs in or creates an account through email OTP.
2. Users browse Tables through home, Discover, Nearby, or search.
3. A user must accept the code of conduct before requesting to join.
4. The host reviews requests and approves guests while seats remain.
5. Approved guests and the host can use the Table group chat.
6. After the meetup, eligible participants can leave reviews.

The earlier **Events** flow—admin-created events, bookings, payment, algorithmic matching, and event feedback—still exists in the API and database but is dormant on web. Do not add Events routes or links back to the web unless explicitly requested.

## Main user roles and capabilities

- **User:** manages an account/profile, discovers Tables, requests to join, receives invites, connects with people, sends messages, and submits reports/reviews.
- **Host:** a normal user with `canHost=true`; can create and manage Tables, review join requests, invite connections, and participate in Table chat.
- **Organizer:** elevated legacy/admin-compatible role. Do not assume this is the same as a Table host.
- **Admin:** grants host access, manages users and Tables, reviews CNIC submissions and reports, curates featured content, and views activity/metrics.

Account status (`ACTIVE`, `SUSPENDED`, or `BANNED`) and role checks are enforced by the API. Public identity is username-based; real name, phone, and email are private to the account owner and administrators.

## Repository map

```text
apps/
  api/          NestJS API and Prisma data model
  web/          Next.js App Router web application and admin console
  mobile/       Out of scope unless explicitly requested
packages/
  types/        Shared API contracts, DTOs, and enums
  api-client/   Shared typed API client; web uses cookie mode
  config/       Shared TypeScript configuration
docs/           Architecture, brand, and design references
tasks/          Historical plans, decisions, progress, and known gaps
e2e/            Browser scripts; several still target the retired Events web flow
```

Key implementation areas:

- `apps/api/prisma/schema.prisma` — canonical persistence model.
- `apps/api/src/auth/` — OTP, sessions, guards, and CSRF.
- `apps/api/src/tables/` — current meetup creation and joining domain.
- `apps/api/src/invites/`, `chat/`, `dm/`, `connections/`, `reviews/`, `safety/` — social and trust features.
- `apps/api/src/admin/` and `verification/` — administration and manual CNIC review.
- `apps/web/src/app/` — user-facing and admin routes.
- `packages/types/src/index.ts` — shared public contracts.
- `packages/api-client/src/index.ts` — client methods used by the web application.

## Current web routes

Important user routes include:

- `/login`
- `/`, `/discover`, `/tables/nearby`
- `/tables/[id]`, `/tables/new`, `/tables/[id]/edit`
- `/meetups`, `/requests`, `/invites`, `/saved`, `/calendar`
- `/messages`, `/connections`, `/notifications`, `/search`
- `/profile`, `/u/[id]`
- `/admin` and `/admin/*`

Do not rely on `/events`, `/receipt`, or the old `/map` route; those web pages were intentionally retired. Nearby Tables now use `/tables/nearby`.

## Core Table rules

- Only users with `canHost=true` may create a Table.
- A Table needs either a cafe or valid custom coordinates.
- Seat capacity is between 2 and 50.
- A host cannot request to join their own Table.
- A guest must accept the code of conduct before requesting to join.
- Join requests start as `PENDING`; hosts approve or decline them.
- Approval claims a seat transactionally and marks the Table full when no seats remain.
- Leaving releases a seat for an approved guest.
- Editing is blocked after the start time and for cancelled/completed Tables.
- Table chat is restricted to the host and approved guests.
- Reviews are allowed only after the scheduled start time.
- CNIC verification and gender-track restrictions are not currently required to join a Table.
- Paid Tables are incomplete: price/payment fields and notifications exist, but Table checkout is not implemented.

## Authentication and privacy

- New accounts use **email OTP once** to verify the first login and set a password; subsequent web sign-ins use email and password.
- Forgot-password uses email OTP to authorize a password reset.
- New accounts also collect a Pakistan phone number, first name, last name, and unique username.
- Current web authentication requests the bearer-token response, stores it under `jrst_token` in `localStorage`, and sends it through `Authorization`.
- The API also supports an httpOnly cookie with double-submit CSRF, but that is not the current web-client path.
- Never expose private user fields through public serializers or profile endpoints.
- CNIC images are sensitive. Existing verification is manual and local; do not expand CNIC storage or handling without an explicit security/privacy review.
- Never expose `devCode` or log OTP values in production behavior.
- Store passwords only as salted scrypt hashes; never log or persist plaintext passwords.

## Contract and data-change workflow

For changes that cross layers, keep them synchronized:

1. Update `apps/api/prisma/schema.prisma` when persistence changes.
2. Add a reviewed Prisma migration; do not use destructive migration commands without approval.
3. Update API DTO validation and service/controller behavior.
4. Update `packages/types/src/index.ts`.
5. Update `packages/api-client/src/index.ts`.
6. Update the consuming web route/component.
7. Add or update focused tests.

Do not silently change an API shape in only one layer. Preserve public/private serializer boundaries.

## Engineering conventions and gotchas

- Use Node 24 and pnpm 11.
- Prisma 7 configuration lives in `apps/api/prisma.config.ts`; do not add a datasource URL to `schema.prisma`.
- Fire-and-forget service methods that write through Prisma must `await` internally because Prisma promises are lazy.
- The web uses shadcn/base-ui. Its Button does not support `asChild`; use its `render` prop or style a Link with `buttonVariants`.
- Avoid direct state updates in React effect bodies; use an async function with an active/cancellation guard where appropriate.
- Bind stored `globalThis.fetch` references before calling them.
- Use Tailwind theme/design tokens and existing components rather than hardcoded visual values.
- Maps use MapLibre and OpenStreetMap/Photon, not Mapbox.
- Polling is intentional in current chat/map features; do not introduce WebSockets without a demonstrated need.
- Never deploy from the CLI. Deployment is handled through CI/CD.

## Local development

Prerequisites are PostgreSQL 16, Redis, Node 24, and pnpm.

```bash
pnpm install
pnpm --filter @jrst/api exec prisma migrate deploy
pnpm --filter @jrst/api exec prisma generate
pnpm --filter @jrst/api db:seed
```

Run the scoped applications:

```bash
pnpm --filter @jrst/api start
pnpm --filter @jrst/web dev
```

- API: `http://localhost:4000/api`
- Web: `http://localhost:3000`

## Verification

Prefer focused checks first:

```bash
pnpm --filter @jrst/api typecheck
pnpm --filter @jrst/web typecheck
pnpm --filter @jrst/api lint
pnpm --filter @jrst/web lint
pnpm --filter @jrst/api test
pnpm --filter @jrst/api build
pnpm --filter @jrst/web build
```

Root `pnpm typecheck`, `pnpm lint`, and `pnpm build` also include mobile, so avoid using them as the only validation when mobile is intentionally out of scope.

Several scripts in `e2e/`, especially `clickpath.mjs`, still expect the retired Events web journey. Inspect an e2e script before treating it as valid for the current Tables experience.

## Known gaps

- Paid Table checkout and a production Pakistan payment gateway.
- Production OTP delivery configuration and documentation alignment.
- Automated/third-party identity verification; current CNIC review is manual.
- WhatsApp and push notifications.
- Table-focused automated browser coverage.
- Cleanup or formal deprecation of dormant Events/bookings/matching code.
- Some search, social-link, mutual-friend, and presence UI remains partial or locally derived.

Do not fake external integrations or credentials. Implement seams only when requested and clearly mark provider-dependent work.

## Reference priority

Use references in this order:

1. Current implementation and Prisma schema.
2. `CHANGELOG.md` and recent dated task files.
3. `tasks/progress.md` for historical decisions and framework gotchas.
4. `docs/design/DESIGN-BRIEF.md` and current design assets for product direction.
5. `README.md` and `docs/architecture.md` for setup/history, checking them against current code because parts are Events-era.

