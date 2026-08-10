# Changelog

All notable UI/product changes are logged here.

## [Unreleased]

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
