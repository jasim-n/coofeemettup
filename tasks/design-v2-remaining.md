# Design v2.0 — remaining features

All 9 design screens are visually rebuilt (green + Poppins + FontAwesome). This
tracks the **stubbed features** whose backend isn't built yet.

## Done ✅
- All 9 screens: nav+dropdown, Home, Explore, Nearby, Meetups, Search, Table detail, Profile, Messages
- **Saved** — bookmark tables end-to-end (hearts + `/saved` + `savedTableIds`)
- Messages does real **group chat** over table chat
- **Connections** ✅ — request/accept/decline/remove, `/connections` page, wired into Explore/Search/Profile (Connection model + module)
- **People you may know / Suggestions** ✅ — real suggestions + Connect in Explore/Search/Connections (mutuals still 0 until mutual-count computed)

- **1:1 Direct Messages** ✅ — DirectMessage model + dm module; Messages hub unified (DMs + group chats + new-message from connections)
- **Invitations** ✅ — TableInvite model + invites module; host invites a connection from the table page; `/invites` + Meetups rail/tab (Accept → seat-claim join, Maybe, Decline); dropdown/profile "Invitations" → `/invites`

## Social graph (remaining)
- **mutual-friends count** (currently 0 in suggestions/connections). *Small.*

## Meetup / social extras
5. **Presence — "Active now" / online dots** — heartbeat/realtime. *Medium.*
6. **Reactions (❤️) + unread counts** in Messages. *Small–medium.*
7. **Full calendar** page ("View full calendar"). *Small–medium.*

- **Other-user public profile** ✅ — `GET /users/:id/profile` (public-safe fields, block-guard, viewer connectionState + stats) + `/u/[id]` page (hero, stats, About/Vibe, reviews). `UserLink` wraps every clickable avatar/name across connections, invites, requests, messages (+ `?dm=` deep link), table detail/chat, discover & search people rails.

## Profile extras
8. **Achievements** — badges with real criteria. *Small–medium.*
9. **Social links** — LinkedIn/Instagram/etc. *Small.*

## Platform
11. **True global search** — real server search across tables + people (nav search currently client-filters `/search`). *Medium.*
12. **Trending / Popular cities** — real metrics (currently derived/stub). *Small.*
13. **Billing / Premium** — deferred (free until go-live). *Deferred.*
14. **Mobile bottom nav** — desktop nav done; mobile still uses tile launcher. *Small–medium.*

## Separate — go-live/product blockers (not design screens)
- **Payments** — paid tables have no checkout flow.
- **Real SMS OTP** — remove `EXPOSE_DEV_OTP` + login test-number hint.
- **CNIC/NADRA verification** — currently manual admin approval.
