# Design v2.0 — remaining features

All 9 design screens are visually rebuilt (green + Poppins + FontAwesome). This
tracks the **stubbed features** whose backend isn't built yet.

## Done ✅
- All 9 screens: nav+dropdown, Home, Explore, Nearby, Meetups, Search, Table detail, Profile, Messages
- **Saved** — bookmark tables end-to-end (hearts + `/saved` + `savedTableIds`)
- Messages does real **group chat** over table chat
- **Connections** ✅ — request/accept/decline/remove, `/connections` page, wired into Explore/Search/Profile (Connection model + module)
- **People you may know / Suggestions** ✅ — real suggestions + Connect in Explore/Search/Connections (mutuals still 0 until mutual-count computed)

## Social graph (remaining)
2. **1:1 Direct Messages** — DMs between users (group chat already real; Connections now exist to gate DMs). *Large.*
   - mutual-friends count (currently 0) is a small add on top of Connections.

## Meetup / social extras
4. **Invitations** — invite to a table + Accept/Maybe (nav "Invitations" currently → /requests). *Medium.*
5. **Presence — "Active now" / online dots** — heartbeat/realtime. *Medium.*
6. **Reactions (❤️) + unread counts** in Messages. *Small–medium.*
7. **Full calendar** page ("View full calendar"). *Small–medium.*

## Profile extras
8. **Achievements** — badges with real criteria. *Small–medium.*
9. **Social links** — LinkedIn/Instagram/etc. *Small.*
10. **Other-user public profile** — view a host/member's public page. *Medium.*

## Platform
11. **True global search** — real server search across tables + people (nav search currently client-filters `/search`). *Medium.*
12. **Trending / Popular cities** — real metrics (currently derived/stub). *Small.*
13. **Billing / Premium** — deferred (free until go-live). *Deferred.*
14. **Mobile bottom nav** — desktop nav done; mobile still uses tile launcher. *Small–medium.*

## Separate — go-live/product blockers (not design screens)
- **Payments** — paid tables have no checkout flow.
- **Real SMS OTP** — remove `EXPOSE_DEV_OTP` + login test-number hint.
- **CNIC/NADRA verification** — currently manual admin approval.
