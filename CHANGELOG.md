# Changelog

All notable UI/product changes are logged here.

## [Unreleased]

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
