# Future features plan (flag-gated)

**Flag:** `NEXT_PUBLIC_FUTURE_TASKS`  
- `true` or **unset** → future UI **hidden** (safe default for production)  
- `false` → future UI **visible** (local/preview only until ready)

Do not use `NODE_ENV` for this. Existing Tables flows must keep working regardless of the flag.

---

## 1. Meetup reminders (“your table is tomorrow”)

| | |
|--|--|
| **Why** | Reduces no-shows; natural for cafe meetups |
| **UX** | Opt-in on Profile → “Remind me the day before” |
| **v1 (now)** | Preference stored (`remindBeforeMeetup`); UI gated |
| **v2** | Cron/worker sends email (reuse OTP mail provider) |
| **Risk** | Low if preference-only until mail job exists |

## 2. Host templates + recurring

| | |
|--|--|
| **Why** | Hosts repeat “Saturday Blue Area” without retyping |
| **UX** | On create Table: “Save as template” / “Use template” |
| **v1 (now)** | Gated stub card only — **no** schema/join changes |
| **v2** | `TableTemplate` model + clone into create form |
| **v3** | Recurring series (careful with seats/chat) |
| **Risk** | High if rushed — keep stub until hosts ask |

## 3. Surprise Me + curated sessions

| | |
|--|--|
| **Why** | Platform-hosted delight when discovery is thin; rewards good guests |
| **UX** | Opt-in “Surprise me”; later: invite to a special table |
| **v1 (now)** | `surpriseMeOptIn` + gated Profile toggle + interest mix |
| **v2** | Admin: pick opted-in users → create Table + invites (manual) |
| **v3** | Semi-auto grouping by interest mix + ratings |
| **Risk** | Medium — keep **opt-in**; never auto-charge or force accept |

## 4. Interest mix graph (own profile)

| | |
|--|--|
| **Why** | Explains “how you’ve shown up” from real join/host history |
| **UX** | Simple bar/stack on **own** Profile only (not public) |
| **v1 (now)** | `GET /users/me/interest-mix` from approved joins + hosted categories |
| **v2** | Weight by completed + review activity (still private) |
| **Risk** | Low — read-only aggregate |

## 5. Waitlist when full

| | |
|--|--|
| **Why** | Popular tables shouldn’t dead-end at FULL |
| **UX** | “Join waitlist” on full tables; host promotes |
| **v1 (now)** | Gated stub only — **JoinStatus has no WAITLISTED** |
| **v2** | Extend `JoinStatus` + transactional promote (like old Events) |
| **Risk** | High — do **not** change join logic until designed |

## 6. Light no-show signal

| | |
|--|--|
| **Why** | Hosts need a gentle reliability loop |
| **UX** | Host marks “didn’t show” after complete → soft reliability nudge |
| **v1 (now)** | Documented only / stub in plan UI |
| **v2** | Host-only action + rate limits |
| **Risk** | Abuse if public — keep host-only |

## Explicitly later (not in this flag pack)

- Paid Table checkout / PK gateway  
- WhatsApp / push  
- Open public profiles for all  
- Full auto-matching engine as the main product  

---

## Implementation status

| Item | Code | UI (when flag false) |
|------|------|----------------------|
| Flag helper | done | — |
| Interest mix API | done | Profile panel |
| Surprise Me preference | done | Profile toggle |
| Remind-before preference | done | Profile toggle |
| Host template / waitlist / no-show | stubs | Profile “Coming soon” cards |
| Auto surprise matching | not started | — |
