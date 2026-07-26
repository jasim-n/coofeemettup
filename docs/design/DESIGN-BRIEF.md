# Product & Design Brief — "Tables" direction

> Source: founder-provided flow diagrams + design-system board (WhatsApp, 2026-07-24).
> Reference images live in [`./reference/`](./reference/).

This brief reframes the product around **Tables**. Read it before touching product/UX.

---

## 1. The core reframe: "Table"

A **Table** = a hosted get-together at a venue with a limited number of seats. It replaces the
current **Event** concept, with two big shifts:

- **Hosting is permission-gated.** Only accounts with a **`host` flag** enabled can create Tables —
  NOT every user. Regular users can only browse/join. (Flag is a per-account boolean, e.g.
  `canHost`; how it gets granted — admin-toggled vs application — is TBD, see §5.) The *Create
  Table* button/flow is hidden for non-hosts and the create API rejects them.
- **Joining is approval-based** — you request to join, the host approves, then you're in (and get
  the table's chat). This replaces the current instant *join → pay* path.

Language change across the product: **Event → Table**, **attendee → seat/guest**, **organizer → host**.

---

## 2. Flows

### 2.1 First Launch — [`reference/01-first-launch-flow.jpeg`](./reference/01-first-launch-flow.jpeg)
`Splash → Onboarding Screens → Login/Signup → OTP Verification → Complete Profile → Notification & Location Permissions → Home`

New vs today: **Splash**, **Onboarding** (intro carousel), and an explicit **Permissions** step
(push + location). OTP + Complete-Profile already exist.

### 2.2 Create Table — [`reference/02-create-table-flow.jpeg`](./reference/02-create-table-flow.jpeg)
`Table → Choose Venue → Date & Time → Number of Seats → Category → Description/Rules → Publish`

A user-facing multi-step wizard to publish a Table. New concepts: **Category** and
**Description/Rules** per table. "Choose Venue" maps to the existing cafe/venue + custom-location
picker.

### 2.3 Regular Flow (main app) — [`reference/03-regular-flow.jpeg`](./reference/03-regular-flow.jpeg)
**Home → 4 primary destinations: Chat · Nearby Tables · Discover · Profile**

- **Chat** → `Join Chat → Wait for Approval → Chat Joined` · `Table Chats` (list) · `Leave Chat`
- **Nearby Tables** → `Select Table → View Details → Join → Wait for Approval` (location-based list)
- **Discover** → `Search / Filters → Select Table` (browse/search by category, etc.)
- **Profile** → `Settings · Reviews · Personal Info · Interests · Past Tables`

Note the join loop: **View Details → Join → Wait for Approval → (approved) → Chat Joined**. Chat
access is gated on approval.

---

## 3. Design system — [`reference/04-design-system.jpeg`](./reference/04-design-system.jpeg)

- **Typography**
  - Headings: **Manrope**
  - Paragraph / body text: **Poppins**
- **Color palette** (dark-leaning; approximate hex — confirm exact values from the board):
  | Role | Approx | Notes |
  |---|---|---|
  | Ink / near-black | `#181A1B` | primary dark surface / text on light |
  | Dark gray | `#3A3C3D` | secondary surface |
  | Light gray / off-white | `#E6E7E5` | light surface / text on dark |
  | Deep teal | `#0F857A` | primary brand (darker) |
  | Bright teal / turquoise | `#17C3A8` | primary brand (accent / CTAs) |

  → **Brand = teal** (not the current coral/cream "bold & social" palette). Leans dark-mode.

---

## 4. Delta vs the current build (what would change)

| Area | Today | This brief |
|---|---|---|
| Core noun | Event (admin-created) | **Table** (hosted only by accounts with the `host` flag) |
| Join | instant join → pay | **request → host approval → join** |
| Discovery | list + map | **Nearby Tables** (location) + **Discover** (search/filters) |
| Chat | per matched group, after admin forms groups | **per-table**, gated on join approval; top-level tab |
| Profile | edit profile | **Settings · Reviews · Personal Info · Interests · Past Tables** |
| Reviews | none | **rate table/host** (new) |
| Onboarding | none | **Splash + Onboarding + Permissions** |
| Type | Syne + Plus Jakarta Sans | **Manrope + Poppins** |
| Color | coral + cream | **teal**, dark-leaning |

Already-built pieces that carry over: phone-OTP auth, profile/intake, venues + custom-location map
picker, payments seam, group chat (rework to per-table + approval gating), notifications, cancel/
refund, admin console.

---

## 5. Open questions (confirm before building)

- Does **payment** stay (ticket/seat fee) or move to free/optional under the host model?
- Is **matching** (auto-grouping) still used, or fully replaced by host-approved joining?
- **Reviews**: rate the host, the table, or both? Public or private?
- **Categories**: fixed list or free-form?
- Adopt the **teal + dark** system app-wide now (replacing the coral redesign), or keep light as default?
- **Host flag**: how is it granted — admin toggles it, or users apply/get approved? Any host
  onboarding/verification before the flag is enabled?
- Scope order: which flow to build first (Create Table? Discover/Nearby? Approval-join?).
