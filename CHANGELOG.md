# Changelog

All notable UI/product changes are logged here.

## [Unreleased]

### 2026-08-13 — Venue map pin drops on search select

- On Table create/edit (and admin cafes), choosing a venue search result fills
  name/address/coords, **drops the LocationPicker pin on that point**, flies the
  map camera there, and scrolls the map into view.
- Documented in [`docs/features.md`](docs/features.md).

### 2026-08-13 — Peer reviews with score-only profiles

- After a Table’s start time, the host and approved guests can rate **each other**
  (not only guest → host). Leave-review UI continues to use existing review-target
  endpoints.
- Self and public profiles show calculated scores only (`overallRating` plus host /
  guest breakdowns). Individual review comments are no longer returned on
  user-facing reputation endpoints; admins still moderate full reviews.
- **No DB migration** — peer reviews reuse the existing `Review` unique key
  `(tableId, reviewerId, subjectId)`; scores remain on-read aggregates.
- Feature wiring and edge cases documented in [`docs/features.md`](docs/features.md).
- Feature map (wiring, edge cases, file layout): [`docs/features.md`](docs/features.md).

### 2026-08-13 — Create-account email gate

- Creating an account with an email that already exists is blocked before an OTP
  is sent; users are directed to sign in or forgot-password instead.

### 2026-08-13 — Protect authenticated web routes

- Added a centralized route guard that redirects logged-out users to `/login`
  and leaves only authentication and legal pages publicly accessible.

### 2026-08-13 — Auto-detect password setup

- Existing accounts without a password now automatically enter email OTP
  password setup from the sign-in form.
- Unknown emails remain on the normal invalid-login path, while accounts that
  already have passwords cannot use the first-login OTP flow.

### 2026-08-13 — Password login and password reset

- First-time account verification continues to use email OTP and now requires
  setting a password.
- Subsequent sign-ins use email and password instead of OTP.
- Added email-OTP password reset with automatic sign-in after a successful reset.
- Added salted scrypt password hashing and a nullable migration-safe password
  field; existing accounts can complete password setup through the first-login
  email flow.

### 2026-08-13 — Table banner upload on create/edit

- Hosts can upload an optional **banner image** while creating or editing a
  Table (`/tables/new`, `/tables/[id]/edit`): preview, replace, and remove.
- Upload goes through `POST /tables/cover` (host-only) into media storage; the
  returned URL is saved as `Table.imageUrl`. If skipped/removed, cards fall back
  to the existing category cover. (`banner-picker`, tables create/update DTOs,
  api-client `uploadTableCover`)

### 2026-08-12 — Meetups: hide past & cancelled events from active views

- **Cancelled tables are hidden everywhere.** `applyFilters` now drops any
  `CANCELLED` table from every browse/active list, and drops `COMPLETED` ones
  from all non-"past" views.
- **"My Meetups" & "Upcoming" show only live upcoming commitments.** Past,
  cancelled and completed tables no longer appear there — they belong in the
  **Past** tab. The Past tab also excludes cancelled tables. (`meetups`)

### 2026-08-12 — Explore: remove redundant "View all" / "See all"

- Removed the self-linking **"View all"** (Top categories) and **"See all"**
  (Recommended for you) buttons on `/discover` — both pointed back to the same
  page. Kept the functional "Your upcoming → View all" (→ /meetups).

### 2026-08-12 — Privacy identity: public @handle, private name/phone/email

- **Handles are the public identity.** Every account now has a unique `@username`.
  Other members see ONLY the handle — never your real name, phone, or email.
  Public profile, table host/participants, join requests, group & event chat,
  DMs, connections, invites, reviews and member search all render `@handle`.
- **Real name + phone + email are private.** Visible only to you (your own
  profile/settings) and to admins. The API strips name/phone/email from
  `toPublicUser`; only `toSelfUser` and admin endpoints include them. (Fixed the
  leak where phone rode along in every public user payload.)
- **Phone still required per account** — it stays a unique, mandatory field (the
  admin lifeline to reach people); it's just no longer shown to other users.
  Email is likewise unique + private, and remains the OTP login key.
- **Signup collects name + handle.** New users pick a public `@handle` (live
  availability check, 3–20 chars) and give their first + last name and phone.
  Copy makes it explicit: *"Your @handle is public. Your name, phone & email stay
  private."* Duplicate handle/phone/email are rejected.
- **Profile edit** gains Handle + First/Last name fields; the home dashboard shows
  a "finish your profile" prompt to existing users missing a name.
- Backend: `username`/`lastName` columns (+ migration + backfill of handles for
  existing users), `GET /users/username-available`, handle validation shared util.

### 2026-08-12 — Venue place-search when creating/editing an event

- **Place search (free, no API key).** The "Choose venue" step on both the
  create (`tables/new`) and edit (`tables/[id]/edit`) forms now has a debounced
  search box: type a place → pick a suggestion → it auto-fills the venue name +
  address and drops the map pin (lat/lng). Manual entry + pin-drop still work.
- **Backend geocode proxy.** New `GET /geocode?q=` (authenticated) proxies the
  Photon/OSM geocoder server-side (proper User-Agent, Pakistan-biased, 6s
  timeout) and returns simplified `{name, label, lat, lng}` results.
  (`geo` module, `GeocodeResult` type, `api.geocode`, `VenueSearch` component)

### 2026-08-11 — Invited state, skeletons, grouped Featured carousel

- **Invited state everywhere.** `browse`/`findOne` now include the viewer's
  pending invite (`myInvite`). Table cards (Explore/Home/Meetups) show
  **"Invited"** instead of "Join Table", and the single table page shows a
  **"You're invited" banner with Accept / Decline**. (`tables.service`, `types`,
  `table-cta`, `tables/[id]`, `meetups`)
- **Skeleton loaders on Explore + Nearby.** Both pages now show pulse skeleton
  cards while data loads (instead of a spinner), and Explore's "Trending now" /
  "Popular cities" show skeletons instead of a "0 tables" flash. (`discover`,
  `tables/nearby`)
- **Featured = one carousel per event.** The home Featured section groups photos
  by event — each event gets its own header + horizontal carousel of wider
  images. (`home-dashboard`)


### 2026-08-11 — Join-state cards, event name + multi-category, real presence

- **"Join Table" no longer shows for tables you've already joined.** The list
  endpoints (`browse`, `mineSaved`) now return the viewer's `myRequestStatus`,
  so cards correctly show Going/Requested/Hosting/Full. (`tables.service`)
- **Create meetup: event name + multiple categories.** New "Event name" field
  (→ `title`, shown as the card/page title). Category is now multi-select
  (toggle chips) plus comma-separated custom entries, stored comma-joined.
  Category icons/filters/trending/vibes split multi-categories so a table shows
  under each of its categories. (`tables/new`, `category-icon`, `discover`,
  `home-dashboard`, `create-table.dto` length 60→200)
- **Real online presence.** New `User.lastSeenAt`, bumped (throttled) on each
  authenticated request; `PublicUser.online` = active in the last 5 min. The
  messages "Active now" section now shows only connections who are actually
  online, and avatar green dots are real (were hardcoded). (`session.guard`,
  `user.serializer`, `types`, `messages`)


### 2026-08-11 — Admin Featured picker: search + filters

- The `/admin/featured` page now lets admins **find events** with a search box +
  filters (status, date range, "only events with photos", "my bookmarked
  events") instead of a plain dropdown. Each event card shows its status, date,
  venue, photo count, and featured count; selecting one opens its photos to
  feature. `GET /admin/featured/tables` gained query params
  (q/status/from/to/hasPhotos/bookmarked). (`admin.service`, `types`, client,
  `admin/featured/page.tsx`)


### 2026-08-11 — Admin: featured event photos on home

- **Admin can curate a "Featured" section on the home page.** New `/admin/featured`
  page: pick an event (any table with photos) and tap its event photos to feature
  them. New `TableImage.featured` flag (+ migration). Endpoints:
  `GET /admin/featured/tables`, `GET /admin/tables/:id/images`,
  `POST /admin/images/:imageId/feature` (all audited), and public
  `GET /tables/featured`. Home dashboard shows a "Featured" gallery of the
  curated photos (labeled by event, links to the table) when any are featured.


### 2026-08-11 — Chat ordering + unread indicators

- **Conversations now sort by most-recent message.** Group chats previously used
  the event start date (often future) as their sort key and showed a hardcoded
  "Group chat" text with no unread — so the list wasn't in message order. New
  `GET /tables/mine/group-threads` returns each group's real last message,
  last-message time, and unread count; the messages page merges DM + group into
  one list sorted by recency.
- **Unread indicators for group chats.** New `GroupChatRead` model (per-user
  read marker) + `POST /tables/:id/read`. Group conversations show a real unread
  badge; opening a chat marks it read (messages page + the standalone table chat
  page). The messages page now polls the thread list every 8s so unread badges
  and ordering update live when new messages arrive.


### 2026-08-11 — Host: end event + event photos

- **Host can end an event.** New `POST /tables/:id/complete` (host-only) marks
  the table COMPLETED and unlocks reviews. Detail page shows an "End event"
  button for the host (hidden once completed/cancelled → "Event ended").
- **Event photo sharing.** New `TableImage` model + endpoints: host uploads via
  `POST /tables/:id/images` (image ≤5MB → Cloudinary), members view via
  `GET /tables/:id/images`, host removes via `DELETE`. Detail page gains an
  "Event photos" gallery — the host can add/delete; approved members view only;
  non-members don't see it. (`tables.service/controller`, `types`, client,
  `tables/[id]/page.tsx`)


### 2026-08-10 — Table card CTA state + invite search

- **Table card button now reflects the viewer's relationship** instead of always
  saying "Join Table": shows "Hosting" (you host it), "Going" (approved),
  "Requested" (pending), or "Full", else "Join Table". Fixes hosts/admins seeing
  "Join Table" on their own tables and already-joined members seeing it too.
  Shared `lib/table-cta.ts` helper used by the Discover, Search, and Home cards.
- **Invite people is now a searchable box.** The host invite list on the table
  detail page gained a search input that filters people by name (scrollable
  results), instead of a long static list. (`tables/[id]/page.tsx`)


### 2026-08-10 — Host requests nav + profile email

- **Host "Requests" inbox reachable on desktop.** The approve/decline page
  (`/requests`) and its pending badge already existed but weren't in the desktop
  top nav (only mobile tiles), so hosts couldn't find it. Added a host-only
  "Requests" nav item with the live pending-count badge. (`desktop-nav.tsx`)
- **Profile now shows the account email as Verified** instead of a hardcoded
  "Not added". Root cause: the UI never read `user.email`, and `me()` dropped
  email (`toPublicUser`) while `verify-otp` returned the *raw* user (leaking
  sensitive fields). Added a self-only `toSelfUser` serializer (email included)
  used by `me()` + `verify-otp`; `email` added to `PublicUser` as an
  owner-only optional field (never populated for other users). Wired the
  profile Identity section + sidebar to `user.email`.
  (`user.serializer.ts`, `auth.controller.ts`, `types`, `profile/page.tsx`)


### 2026-08-10 — Home dashboard skeletons

- **Home dashboard** now shows skeleton loaders while data fetches, instead of
  flashing the "No open tables" empty state + zeroed stats before content
  arrives. Added a `busy` flag and pulse placeholders for "Popular vibes" and
  the "Tables near you" cards. (`components/home-dashboard.tsx`)


### 2026-08-10 — Discover sidebars, profile deep-link + photo upload

- **Discover sticky sidebars** (Filters, Trending/Upcoming/Cities) now have their
  own capped height + independent scroll (`lg:max-h-[calc(100vh-7rem)]
  lg:overflow-y-auto`), so their last items are reachable without scrolling the
  whole page. Mobile unchanged; no scrollbar unless content overflows.
  (`discover/page.tsx`)
- **Profile "#code-of-conduct" deep-link fixed.** The table "Accept in profile"
  CTA links to `/profile#code-of-conduct`, but the section was chosen in a
  `useState` initializer that runs during SSR (window undefined) and isn't
  re-run on hydration → the hash was ignored and you landed on Overview. Now a
  client effect reads the hash, opens the settings section, and scrolls the
  consent checkbox into view. (`profile/page.tsx`)
- **Profile photo upload restrictions.** Client now enforces image type
  (JPG/PNG/WebP) + ≤5 MB before upload (matches the backend), with a clear
  inline error instead of a failed round-trip. (`profile/page.tsx`)


### 2026-08-10 — Logout + OTP delivery fixes

- **Logout was stuck / kept you on the same screen.** `logout()` awaited the
  server call first, so a CSRF/session error left client state uncleared and
  never navigated. Now it clears local state even if the network call fails and
  hard-redirects to `/login`. (`auth-provider.tsx`) There is no route
  guard/middleware — pages gate inline with `if (!user)`.
- **`request-otp` hung (deployed "Sending…" forever).** The OTP send was
  awaited (`otp.service.ts`), so a stalled SMTP connection (common on cloud
  hosts / Gmail) blocked the HTTP response. The code is already persisted before
  the send, so email is now fire-and-forget → `request-otp` returns immediately.
- **SMTP timeouts** added to the mailer transport (connection/greeting/socket)
  so a blocked host fails fast instead of hanging. (`mail.service.ts`)
- **Admin test login** email changed to a real (yopmail) inbox so OTP is
  actually receivable; login screen hint updated. (`login/page.tsx`)


### 2026-08-10 — Discover / Meetups / table-card fixes (from design review)

- **Meetups:** "+ Create Meetup" button now shows only for hosts (`user.canHost`), not every user. (`meetups/page.tsx`)
- **Discover — Trending now:** removed the broken/self-referential "View all" link. (`discover/page.tsx`)
- **Connects:** hidden all connect UI for now — removed the "Suggested for you" people card on Discover + Search, the Connect buttons, and the "Connections" links/entry points on Profile, Messages, and the table detail page. Backend + `/connections` route left intact. (`discover/page.tsx`, `search/page.tsx`, `profile/page.tsx`, `messages/page.tsx`, `tables/[id]/page.tsx`)
- **Discover — Popular cities:** removed the "View all" link (if present). (`discover/page.tsx`)
- **Table card:** Discover card now shows the event **date/time** (was missing; Search/Meetups already did). All table cards now show **distance from the user** and a **Google Maps pin link** for the event location. (`discover/page.tsx`, `search/page.tsx`, `lib/geo.ts`)
- **Meetups:** added **skeleton loading** for the Upcoming / My Meetups lists while data fetches (previously jumped straight to empty states). (`meetups/page.tsx`)
