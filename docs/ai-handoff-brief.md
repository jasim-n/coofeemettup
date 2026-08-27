# Coffee Meetups (JRST) — AI handoff brief

**Purpose:** Give another AI (or human) enough context to understand, advise on, market, or extend this product without digging the whole monorepo.

**Authority order when sources conflict:** (1) live code + `apps/api/prisma/schema.prisma`, (2) `docs/features.md`, (3) `CHANGELOG.md` + dated `tasks/`, (4) this brief, (5) older README / architecture / brand docs (many are Events-era).

**Last reconciled:** 2026-08-27.

---

## 1. One-sentence pitch

**Coffee Meetups** is a Pakistan-first social product for **small, host-approved cafe tables** — discover a limited-seat meetup, request to join, get approved, then chat and leave Moments — not a mass open RSVP events site.

---

## 2. What we are building (vision)

| Dimension | Intent |
|-----------|--------|
| **Job to be done** | Help young adults in Pakistan meet interesting people IRL over coffee in a **safe, curated, seat-limited** way. |
| **Unit of product** | A **Table** (hosted get-together at a cafe / coordinates), not a large “Event”. |
| **Trust model** | Hosts gate who sits; guests accept a **code of conduct**; admins can suspend/ban; report/block exist. |
| **Growth model** | Instagram / social proof + **Featured Moments** (photos, reels, collages) + company-hosted nights + community hosts. |
| **Monetization (near-term)** | Paid seats priced in PKR in-app; **Phase 1 collection off-platform** (WhatsApp / bank transfer after approval). In-app checkout is **not** shipped. |
| **Geography** | Soft-launch focus **Lahore**, ages ~**20–28**; product also speaks Islamabad / broader Pakistan. |

**Tagline / feel:** “Find your people over coffee.” Warm, social, Instagram-native — not a corporate admin tool.

---

## 3. Who it is for

| Persona | Needs | Product role |
|---------|--------|--------------|
| **Guest** | Discover tables, request seats, chat after approval, review after meetup | Default user |
| **Host** | Create/manage tables, approve requests, invite connections, Moments | User with `canHost=true` (admin-granted) |
| **Company / ops** | Run branded tables, approve hosts, feature Moments, moderate | Admin / organizer |
| **Advertiser / growth** | Convert IG → signup → join request → confirmed seat | Uses web + WhatsApp SOP |

**Not the primary audience (yet):** nationwide scale, pure dating, open free-for-all RSVPs, heavy B2B venue SaaS.

---

## 4. Core user journey (current web product)

```text
Email signup (OTP once → set password) / email+password login
  → Accept code of conduct when joining
  → Browse: Home · Discover · Nearby · Search · Meetups · Calendar · Saved
  → Open Table → Request to join
  → Host approves (transactional seat claim) or declines
  → Approved: group chat, invites, Moments (media)
  → After start: reviews between eligible participants
  → Optional: connections, DMs, notifications, invite friends
```

**Important product rules**

- Only `canHost` users create Tables.
- Seat capacity 2–50; host cannot join own table.
- Join requests start `PENDING`; approval claims a seat; leave releases a seat.
- Edit blocked after start / cancelled / completed.
- Chat = host + approved guests only.
- Reviews only after scheduled start.
- CNIC / gender-track **not** required to join today (verification exists for admin review).
- Public identity is **`@username`**; name / phone / email are private.

---

## 5. What “sold” means (how to sell it)

### 5.1 Consumer value proposition

- **Safer than open Instagram DMs / random WhatsApp groups:** request + host approval + conduct + report.
- **Higher signal than Meetup-scale events:** 2–50 seats, theme/vibe, cafe context.
- **Social proof loop:** Moments / Featured reels for FOMO and retargeting creatives.

### 5.2 Dual supply (must say clearly in GTM)

1. **We host** — “Coffee Meetups presents…” nights for trust + content.
2. **You host** — friends/creators run limited tables; platform handles discovery + requests.

### 5.3 Pricing / payment messaging (critical)

- Show **PKR** on the table when paid.
- **Do not** advertise in-app card checkout until built.
- Phase 1 script: *“After the host approves you, we confirm payment on WhatsApp.”*

### 5.4 Primary GTM channel (documented plan)

- **Instagram-only** soft launch (Reels, Stories, Meta ads).
- Funnel: Reel → bio link → signup → Discover / table → request → approve → WhatsApp pay → attend → Moments → next table.
- Month-1 ad budget ballpark: **~$350–550** (Lahore 20–28).
- Plan file: `tasks/2026-08-21-lahore-instagram-launch-plan.md`.

### 5.5 What to sell to stakeholders / investors (narrative)

- **Market:** Urban PK young professionals / students with cafe culture + Instagram habits; trust and curation are scarce.
- **Moat path:** Local ops + host network + Moments content flywheel + approval culture (not generic “events CMS”).
- **Expansion:** More cities after Lahore unit economics; later in-app payments, push/WhatsApp automation, mobile app.

---

## 6. Shipped product surface (capabilities)

### Discovery & tables

- Home dashboard (signed-in), Discover, Nearby (map), Search, Meetups, Calendar, Saved.
- Create / edit Table (hosts); detail page with CTA states via shared `tableCta` helper.
- Join requests, host inbox (`/requests`), invites (`/invites`).
- Featured Moments on home (IMAGE / VIDEO / COLLAGE + admin layout presets).

### Social & trust

- Connections, DMs (`/messages`), table group chat.
- Notifications, presence (`lastSeenAt`, ~5 min online).
- Reviews / reliability score.
- Report / block; admin moderation.
- Code of conduct acceptance before join.

### Identity & admin

- Email OTP for first login password setup + password reset; normal login email/password.
- Bearer JWT in `localStorage` (`jrst_token`) on web (cookie+CSRF also exists on API, not current web path).
- Admin: users (suspend/ban/host grant), tables, cafes, featured, verifications (CNIC), reports, activity, reviews, settings.
- Member public profiles `/u/[id]` are **admin/organizer-only** today (privacy decision).

### Mobile web

- Sticky bottom MobileNav (signed-in, `md:hidden`); desktop nav at `md+`.
- Recent work: site-wide responsive layouts; profile tabs swipeable.

### Out of scope unless asked

- **`apps/mobile`** — ignore for product planning unless explicitly requested.
- Dormant **Events / bookings / matching** API still in DB — do not revive on web without an explicit decision.

---

## 7. Technical snapshot (for implementation AIs)

| Layer | Choice |
|-------|--------|
| Monorepo | pnpm 11 + Turborepo; Node 24 |
| API | NestJS 11, Prisma 7, PostgreSQL, Redis |
| Web | Next.js 16 App Router, React 19, Tailwind v4, shadcn/base-ui |
| Contracts | `@jrst/types`, `@jrst/api-client` |
| Maps | MapLibre + OSM / Photon (not Mapbox) |
| Chat realtime | **Polling** (no WebSockets yet) |

**Local:** API `http://localhost:4000/api`, Web often `http://localhost:3000` (or 3001 if busy).

**Deploy:** CI/CD only — do not deploy from CLI. Do not run Prisma migrations on app startup.

**Cross-layer change order:** schema → migration → API → `@jrst/types` → `@jrst/api-client` → web → tests.

---

## 8. Known gaps / do-not-fake

| Gap | Status |
|-----|--------|
| In-app paid Table checkout / PK payment gateway | Not implemented |
| Production OTP email delivery | Provider-dependent |
| Automated identity verification | Manual CNIC review only |
| WhatsApp Business API / push notifications | Not shipped |
| Table-focused e2e browser suite | Missing; old Events e2e stale |
| Formal retirement of Events domain | Pending decision |
| Search / mutual friends / some social UI | Partial |

Never invent credentials or claim external integrations are complete.

---

## 9. Business rules (short list)

1. Hosting is permission-gated (`canHost`).
2. Joining is request + host approval (seat inventory transactional).
3. Conduct acceptance required before request.
4. Locked accounts (`SUSPENDED` / `BANNED`) cannot authenticate or use APIs.
5. Private PII must not leak via public serializers.
6. OTP `devCode` must never ship in production behavior.
7. Passwords: salted scrypt only; never log plaintext.

---

## 10. Success metrics (launch phase, directional)

From Lahore IG plan (first ~4 weeks):

- Signups 80–150  
- Join requests 40–80  
- Paid/confirmed seats (WhatsApp) 20–40  
- Company tables that run 4–6  
- New external hosts 3–8  
- Repeat attenders ≥15%  

Optimize ads for **join requests / confirmed seats**, not vanity followers.

---

## 11. Repo map (where to look)

```text
apps/api/          NestJS + Prisma
apps/web/          Next.js product + admin
apps/mobile/       Out of scope by default
packages/types/    Shared contracts
packages/api-client/
docs/features.md   Shipped feature wiring
docs/ai-handoff-brief.md   This file
docs/ai-handoff.json       Machine twin
tasks/2026-08-21-lahore-instagram-launch-plan.md
CHANGELOG.md
CLAUDE.md / .cursor/rules/   Agent conventions
```

---

## 12. Instructions for the receiving AI

When helping on this project:

1. Treat **Tables-first web** as the product; do not reintroduce Events UX unless asked.
2. Prefer **business + GTM advice** from §§2–5 and the Lahore launch plan; prefer **code** for “what works today”.
3. Ignore mobile app unless the user says otherwise.
4. Do not invent payment gateways, WhatsApp APIs, or OTP providers — design seams and mark TODOs.
5. Preserve unrelated working-tree changes; scoped verify with `pnpm --filter @jrst/web|api …`.
6. Brand docs under `docs/brand.md` may still mention coral/Syne/Mapbox — **verify against current web** (Poppins / current theme tokens / MapLibre).

---

## 13. Elevator variants (copy you can reuse)

**15s:** “Coffee Meetups is small cafe tables in Pakistan — request a seat, hosts approve, then you meet IRL.”

**30s:** “We’re building the anti-mass-event social layer for Lahore: limited seats, host approval, and Instagram-ready Moments. Guests discover tables on the web; we and community hosts fill nights; Phase 1 payments close on WhatsApp after approval.”

**Investor:** “Trust-gated, seat-limited IRL social for Pakistan’s cafe culture, with a content flywheel (Moments) and a dual supply of company + community hosts. Checkout and automation come after unit economics in one city.”
