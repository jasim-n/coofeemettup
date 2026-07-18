# Architecture & Build Roadmap

_Created 2026-07-15. Greenfield. Target = full product (incl. v2 map), built incrementally. Private project._

## Locked decisions (from concept phase)
- **Web first** (Next.js) → then RN mobile on the same API.
- **Dedicated NestJS API** serving both web + mobile.
- **Target scope = full product** incl. live map, built in phases (skeleton → MUST → v2).
- **Per-event pricing** (`Event.pricePKR`, organizer-set).
- **Women-only-led**, Islamabad F-6/F-7, CNIC-verified, public cafes.

## Proposed stack
> Exact versions pinned from the npm registry **at scaffold time**, not from memory (per working agreement). Rationale given so we can challenge each.

| Layer | Choice | Why |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Share types/config across api + web + mobile; fast CI caching |
| Backend | **NestJS** | Chosen; structured, DI, good for a growing domain |
| DB | **PostgreSQL** | Relational fit (users, events, matches, feedback); mature |
| ORM | **Prisma 7.8.0** (project-local devDep) | Type-safe, migrations; confirmed by user. Public npm only, no org packages |
| Web | **Next.js (App Router) + React** | Chosen; SSR + admin console + marketing pages |
| Styling | **Tailwind CSS + shadcn/ui** | Own the components; no external/org design system (NOT DWTC) |
| Mobile | **React Native + Expo** | Fastest RN path; OTA updates; one codebase iOS+Android |
| Auth | **Phone OTP → session/JWT + CSRF double-submit cookie** | PK is phone-centric; CSRF matches house pattern |
| Shared | `packages/types`, `packages/api-client` | One source of truth for DTOs across web + mobile |
| Jobs/queue | **BullMQ + Redis** | Matching runs, reminders, OTP throttling |
| Storage | **S3-compatible (R2 / S3)**, encrypted | CNIC images = sensitive PII; encrypt at rest, short-lived URLs |
| Maps (v2) | **Mapbox GL** (web) + RN Mapbox | Live event pins, seats-left |
| Realtime (v2) | Start **polling**, upgrade to WebSockets if needed | Don't build realtime before it's warranted |
| Notifications | WhatsApp Business API / Twilio + Expo push | PK runs on WhatsApp |
| Deploy | **CI/CD only** (GitHub Actions) → Vercel (web) + container host (api) | Never deploy from CLI (house rule) |

## ⚠️ Spikes — VERIFY before designing against them (do NOT assume)
1. **Payments (PK):** likely **Safepay** or **Paymob Pakistan** as card+wallet aggregator, plus Easypaisa/JazzCash. **Verify current API, sandbox, fees, settlement, and whether they expose Raast** before committing. Build against sandbox first.
2. **CNIC verification:** NADRA API access is **restricted/regulated** — do NOT assume a self-serve API exists. Plan for **manual review of uploaded CNIC image** first; treat automated KYC as a later, verified integration. Confirm legal/PII obligations for storing CNIC data.
3. **WhatsApp Business API** onboarding + template-message approval timeline.

## Data model (first cut — refine in plan)
- **User** (profile = §12 intake fields), verificationStatus, reliabilityScore, blockedUserIds[]
- **Event** (cafeId, startAt, genderTrack, area, capacity, **pricePKR**, seatsLeft, status)
- **Cafe** (name, area, dead-hour slots, comp/discount terms)
- **Booking** (userId, eventId, paymentStatus, attendanceStatus)
- **Match / GroupAssignment** (eventId, userIds[], matchScore, algoVersion)
- **Feedback** (§13 answers, per user per event) → feeds reliabilityScore + matching weights
- **Report** (reporter, subject, reason) → moderation + blocklist

## Phased roadmap (each phase ships something usable)
- **Phase 0 — Foundations:** monorepo scaffold, NestJS API skeleton, Next.js web skeleton, Postgres+Prisma, shared types pkg, auth (phone OTP + session/CSRF), CI green.
- **Phase 1 — Walking skeleton (web):** signup+profile → organizer creates event (with price) → user browses+joins → pays (sandbox) → admin triggers a match → feedback capture. One thin end-to-end slice that WORKS.
- **Phase 2 — MUST complete:** CNIC verify flow, **matching engine v1** (greedy port of §10.4 7-step rulebook + BullMQ), reliabilityScore, report/block, full organizer/admin console, payments hardened (real gateway, Easypaisa/JazzCash/Raast).
- **Phase 3 — Mobile:** RN/Expo app on the same API (auth, browse/join, pay, feedback).
- **Phase 4 — v2:** live **Mapbox** map (event pins + seats-left), "see them again" re-pairing (feedback Q3), themed events, WhatsApp/push notifications, realtime seats.

## Gates that apply during build
- **UI work:** **Tailwind + shadcn/ui** (NOT DWTC / no org design system). Optionally use `ui-ux-pro-max` for design intelligence. No hardcoded colors/spacing — use Tailwind theme tokens.
- **Before code touching APIs/DB/types/auth:** implementation-verifier PASS gate.
- **CNIC/payments = PII + money:** server-validation pass + code-reviewer before merge.
- **DB:** show migration diffs, flag destructive, wait for approval.
- Never deploy from CLI — CI/CD only.

## Open items before Phase 0
- Confirm women-only-led vs mixed (copy + track logic).
- Resolve the 3 spikes above (payments, CNIC, WhatsApp) — at least enough to design Phase 1.
- Expo managed vs bare RN (defaulting to managed).
