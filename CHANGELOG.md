# Changelog

All notable UI/product changes are logged here.

## [Unreleased]

### 2026-08-10 — Discover / Meetups / table-card fixes (from design review)

- **Meetups:** "+ Create Meetup" button now shows only for hosts (`user.canHost`), not every user. (`meetups/page.tsx`)
- **Discover — Trending now:** removed the broken/self-referential "View all" link. (`discover/page.tsx`)
- **Connects:** hidden all connect UI for now — removed the "Suggested for you" people card on Discover + Search, the Connect buttons, and the "Connections" links/entry points on Profile, Messages, and the table detail page. Backend + `/connections` route left intact. (`discover/page.tsx`, `search/page.tsx`, `profile/page.tsx`, `messages/page.tsx`, `tables/[id]/page.tsx`)
- **Discover — Popular cities:** removed the "View all" link (if present). (`discover/page.tsx`)
- **Table card:** Discover card now shows the event **date/time** (was missing; Search/Meetups already did). All table cards now show **distance from the user** and a **Google Maps pin link** for the event location. (`discover/page.tsx`, `search/page.tsx`, `lib/geo.ts`)
- **Meetups:** added **skeleton loading** for the Upcoming / My Meetups lists while data fetches (previously jumped straight to empty states). (`meetups/page.tsx`)
