# Design v2.0 — remaining features

All 9 design screens are visually rebuilt (green + Poppins + FontAwesome). This
tracks the **stubbed features** whose backend isn't built yet.

## Done ✅
- All 9 screens: nav+dropdown, Home, Explore, Nearby, Meetups, Search, Table detail, Profile, Messages
- **Saved** — bookmark tables end-to-end (hearts + `/saved` + `savedTableIds`)
- Messages does real **group chat** over table chat

## Social graph (build in order)
1. **Connections** — request/accept/decline, mutual-friends, Connections page, wire "Connect" (Explore/Search/Profile). *Medium–large.* → unlocks 2, 3.  ⬅️ IN PROGRESS
2. **1:1 Direct Messages** — DMs between users (group chat already real). *Large.* Needs #1.
3. **People you may know / Suggested people** — real suggestions via mutuals. *Small* after #1.

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
