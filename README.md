# Coffee Meetups

A curated social-meetup product: an algorithm groups compatible strangers into small groups (6–8) that meet at a cafe over coffee/chai. Launch focus: **Islamabad (F-6/F-7), mixed gender tracks, per-event pricing.** The goal is combating loneliness / making friends — coffee is the low-friction vehicle.

> Product concept, matching logic, intake/feedback forms, and roadmap live in [`tasks/`](tasks/) and [`docs/`](docs/).

## Status

| Phase | Scope | State |
|---|---|---|
| 0 | Monorepo, NestJS API, Prisma 7, phone-OTP + CSRF auth, Next.js web, CI | ✅ |
| 1 | Events, bookings, payments (sandbox), admin groups/attendance, feedback, web + admin UI | ✅ |
| 2 | Matching engine v1 (§10.4 rulebook) · payment seam (hosted-checkout + signed webhook) | ✅ |
| 4 | Live map (MapLibre + OpenStreetMap, no token) | ✅ |
| 3 | Expo mobile app (bearer auth) — login/browse/join | ✅ (bundles; device run = follow-up) |
| — | Real payment gateway · CNIC verification · real SMS OTP | ⛔ needs external accounts |

Everything is built with **free/open-source tools only** — no paid services.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **API:** NestJS 11, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL 16, Redis, JWT, class-validator
- **Web:** Next.js 16 (App Router, React 19), Tailwind v4 + shadcn/ui, MapLibre GL
- **Mobile:** Expo (SDK 57) / React Native 0.86
- **Shared:** `@jrst/types` (contract), `@jrst/api-client` (isomorphic client — cookie mode for web, bearer mode for mobile)

## Prerequisites

- Node 24 (`.nvmrc`), pnpm via Corepack (`corepack enable`)
- PostgreSQL 16 + Redis. Local dev uses Homebrew:
  ```bash
  brew install postgresql@16 redis
  brew services start postgresql@16 redis
  createdb jrst_dev
  ```

## Setup

```bash
pnpm install
# API env (see .env.example): apps/api/.env with DATABASE_URL, REDIS_URL, SESSION_SECRET, …
pnpm --filter @jrst/api exec prisma migrate deploy   # apply migrations
pnpm --filter @jrst/api exec prisma generate
pnpm --filter @jrst/api db:seed                      # admin + cafes + sample events
```

Seeded admin logs in with phone **+923001112222**; the OTP is printed to the API console (dev — no SMS provider yet).

## Run

```bash
pnpm --filter @jrst/api start     # API  → http://localhost:4000/api
pnpm --filter @jrst/web dev       # web  → http://localhost:3000
pnpm --filter @jrst/mobile start  # Expo (iOS sim: localhost works; Android emulator: set EXPO_PUBLIC_API_URL=http://10.0.2.2:4000)
```

## Auth model

- **Web:** phone OTP → httpOnly **session cookie** + **CSRF double-submit** (token echoed in the bootstrap response, sent back as `x-csrf-token` on mutations).
- **Mobile:** send `x-client: mobile` on verify-otp to receive a **bearer JWT**; sent as `Authorization: Bearer` (CSRF not applicable). Token stored in `expo-secure-store`.

## Payments

Hosted-checkout + **HMAC-signed webhook** abstraction (`apps/api/src/payments/`). A `MockPaymentProvider` runs the flow locally with zero cost; a real PK gateway (Safepay/Paymob/Easypaisa/JazzCash/Raast) drops in by swapping one binding in `PaymentsModule`.

## Quality gates

```bash
pnpm typecheck   # tsc across all packages
pnpm lint        # eslint
pnpm test        # jest (API)
pnpm build       # turbo build (api + web)
```

End-to-end (real browser, Playwright): `node e2e/clickpath.mjs` (login → browse → join → pay → feedback → admin). Map check: `node e2e/map-check.mjs`. Both require the API + web + DB running.

## Structure

```
apps/
  api/     NestJS API (auth, events, bookings, payments, admin, feedback, matching)
  web/     Next.js web app + admin console + map
  mobile/  Expo React Native app
packages/
  types/       shared DTOs / enums
  api-client/  isomorphic API client (web cookie mode / mobile bearer mode)
  config/      shared tsconfig base
e2e/       Playwright scripts (clickpath, map-check)
docs/      architecture, concept, code of conduct, recruitment copy
tasks/     build plan + progress (resume anchor)
```
