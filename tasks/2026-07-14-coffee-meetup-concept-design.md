# Coffee Meetup App — Concept & Design (Working Doc)

_Created 2026-07-14. Status: concept refinement, pre-build. Private project._

---

## 1. What this is
A **curated social-meetup product**: an algorithm/organizer groups compatible **strangers** into small groups that meet at a **cafe** (ticket includes one coffee). Real value = **curing loneliness / making friends**; coffee is the low-friction vehicle.

**Wedge vs competitors (Timeleft, 222, Meetup):** coffee not dinner (cheaper, daytime, repeatable) + Pakistan-first + safe/women-friendly design.

## 2. Locked decisions
| Decision | Choice | Why |
|---|---|---|
| Core model | **Curated matching** | Defensible/magical; map + UGC events are v2 |
| Validation path | **Concierge MVP first** | Prove retention for ~PKR 50k before building |
| Launch market | **Pakistan metro** (one city, one neighborhood) | Booming cafe scene, less competition, first-mover |
| Group format | Coffee, dead-hour slots, gender tracks | Safety + cafe economics |

## 3. Business model
- **Cafes don't pay cash upfront.** Trade a guaranteed off-peak group for comped/discounted coffee + group rate. Cash fees (featured placement) come later with leverage.
- **Revenue:** per-event ticket (coffee included) first — this is a **volume game** at PKR ~500–1,500. Introduce a light "regulars" membership only once frequency is proven. No $15/mo subscription early (won't fly at this price point).
- Coffee-included = trial friction remover, thin margin — don't build the business on the coffee.

## 4. Pakistan-specific realities
1. **Payments:** Stripe unavailable for PK businesses. Use **Easypaisa / JazzCash / Raast / bank transfer**; card gateways (Safepay, Paymob PK) later. **Concierge MVP needs zero payment integration** — manual Easypaisa/JazzCash link.
2. **Gender & culture = the wedge.** Offer **women-only / men-only / mixed** tracks from day one. A trusted **women-only** format is the strongest, least-contested position in this market.
3. **Trust:** WhatsApp + **CNIC verification**, not slick UI. Perfect for concierge.

## 5. Concierge MVP playbook (~4–8 weeks, near-zero code)
1. Pick ONE city + one neighborhood (density wins).
2. Landing page + WhatsApp/Instagram funnel: "Meet interesting strangers over coffee this Saturday." Short intake form.
3. **Match by hand** for the first 5–10 events (you are the algorithm — this teaches the rules).
4. Hand-book 2–3 cafes for dead-hour slots; comped/discounted coffee, no contracts/fees yet.
5. Collect payment manually (Easypaisa/JazzCash).
6. Measure the ONE metric after every event (§7).

## 6. Safety (non-negotiable, from MVP)
- ID/CNIC verification; public venues only (cafes ✅).
- Report + block; **never co-locate blocked pairs**.
- **Reliability score** (attendance/no-shows) — NOT public personality star-ratings (harassment/gaming/discrimination risk).
- "Filter people out" = safety blocklist only, never demographic filtering (legal/ethical minefield).

## 7. Go/No-Go gate (do NOT write app code until true)
> **≥40% of first-timers book a *second* event, and some bring a friend, across ≥5 events.**

Retention + referral = real product. If not, the app won't save it — and you learned cheap.

## 8. Feasibility verdict
- **Tech:** non-issue (RN + Next.js + backend + Mapbox is routine).
- **Business risk, ranked:** ① retention → ② payments/trust → ③ cold-start density → ④ cultural/safety design.
- **Verdict:** feasible + timely, genuine PK wedge. Risk is entirely execution *sequencing* — concierge-first defuses it.

## 9. Deferred to post-validation (v2+)
Snapchat-style live map (events pinned w/ time + tickets left) · open organizer marketplace · full account system · native apps · payment gateway · automated matching algorithm.

---

# 10. Matching logic — the moat (refinement pass)

Matching is the core product. Get the *rules* right by hand now; they become the algorithm later.

### 10.1 Philosophy — the "sweet spot"
Best group ≠ most similar people. Aim for **~60–70% common ground** (conversation ignites) + **~30–40% diversity** (interesting, not an echo chamber).
- **No odd-one-out.** Every person must share ≥1 strong tie with ≥2 others. The lone person who shares nothing = worst experience = churn. This is the #1 rule.
- **Balance social energy.** Don't stack 8 introverts (dead) or 8 dominant talkers (chaos). Mix talkers + listeners.

### 10.2 Group size — challenge the 10–20
10–20 fragments into sub-groups and kills a single flowing conversation. Science-backed size for one conversation ≈ **6–8**. **Recommendation: start at 6–8 per table.** If running 10–20, organize as sub-tables of ~6. (Timeleft uses 6.)

### 10.3 Intake data schema (collect now, even in a form)
**Hard constraints (filters):**
- Gender track pref (women-only / men-only / mixed) — absolute
- Availability (day + time slot)
- Reachable neighborhood/area
- Language comfort (Urdu / English / regional)
- Age band (soft-hard; comfort within a range)
- Verified (CNIC) + blocklist

**Soft signals (optimize the mix):**
- Interests / conversation topics (books, startups, film, fitness, food, travel, art, music, faith/deen, gaming…)
- Life stage (student / early-career / professional / parent)
- Social energy (introvert ↔ extrovert; listener ↔ talker)
- Intent (make friends / networking / new to city / practice English) — keep **platonic**, no dating framing (safety + positioning)
- **Newcomer-to-city flag** (powerful to pair thoughtfully)

### 10.4 The 7-step hand-matching rulebook (→ future algorithm)
1. **Filter** by hard constraints → candidate pool per slot.
2. **Anchor** a table on a shared interest or life stage (the seed).
3. **Fill to sweet spot** — add people sharing ≥1 anchor but adding profession/background diversity.
4. **Balance social energy** — ensure a mix of talkers + listeners.
5. **Newcomer pass** — distribute newcomers (not all together, not isolated).
6. **Safety pass** — no blocked pairs, all verified, gender track consistent.
7. **No-show buffer** — slight overbook informed by reliability score; keep a waitlist.

### 10.5 Anti-patterns to avoid
- Odd-one-out (see 10.1). · Repeat-pairing fatigue → track co-occurrence, vary groups unless people opt to reunite. · Echo chamber (too similar). · Blocked-pair collision (safety).

### 10.6 Feedback loop = training data (this is why we structure data now)
After each event, ask each attendee:
- Enjoyment (1–5)
- "Would you meet this group again?" (Y/N)
- Optional: who they'd want to see again
- Attendance / no-show (auto)

This becomes the **outcome signal** that later tunes matching weights + the reliability score. No public personality ratings — only private, aggregate outcome signals.

### 10.7 When it becomes an algorithm (NOT now)
It's a constrained clustering/assignment problem. **Start greedy** (steps 1–7 in code) only after validation; graph-clustering/ILP is a much-later optimization. Do NOT over-engineer matching before you have outcome data to tune against.

---

## 11. Open questions / next passes
- ~~Neighborhood pick~~ → **DECIDED: Islamabad F-6/F-7 cluster** (Kohsar / F-7 Jinnah Super). Lahore Gulberg = market #2 post-validation. See §14.
- Gender-track launch mix (lead with women-only?).
- Pricing test (single ticket price vs tiered).

## 14. Launch neighborhood — DECIDED: Islamabad F-6/F-7
**Why F-6/F-7 (Kohsar Market / F-7 Jinnah Super):**
- Highest safety perception in the city — critical for a women-only-led launch (the #1 driver).
- Tight, walkable cafe density → 2–3 venues in a small radius, hand-manageable for concierge ops.
- Contained, affluent, newcomer-heavy (professionals/diplomatic circles) = the target user.
- Trade-off: smaller pool than Lahore — fine; we want a tight petri dish, not scale, until the §7 gate passes.
- **Market #2:** Lahore Gulberg (MM Alam Rd) for the scale-up.

## 15. Code of Conduct
Shipped standalone → `docs/code-of-conduct.md`. Linked from intake form Q18. Platonic-first, women-safety-forward, CNIC-verified, public-venues-only, clear zero-tolerance list + confidential reporting + block. Required reading before event #1.

## 16. Recruitment / marketing copy
Shipped standalone → `docs/recruitment-copy.md`. IG (bio, launch post, 6-slide carousel, story CTA, DM script) + one-page landing (hero, how-it-works, safety, FAQ, CTAs). **Women-only-led** per §14 (needs final confirm; mixed = line swap). Concierge only — drives to Google Form, **no app**.

## 17. App feature set — v1 (GATED behind §7 go/no-go; NOT build-ready yet)
> **Do not build until the gate passes.** Concierge (form + WhatsApp + landing page) covers everything below manually today. This list is the destination + a feature-creep guard, not a green light. MoSCoW:

**MUST (v1 app = the concierge, automated):**
- Auth + profile (the §12 intake fields as a structured profile)
- CNIC verification flow
- Gender-track + availability + area preferences
- Event browse/join for a given slot + seat count
- Payments (Easypaisa / JazzCash / Raast — NOT Stripe)
- Matching engine v1 (greedy port of the §10.4 7-step rulebook)
- Post-event feedback capture (§13) + reliability score
- Report + block (safety)
- Basic organizer/admin console (create events, see matches, manage no-shows)

**SHOULD (v1.1):**
- Notifications (WhatsApp/push) for match confirm + reminders
- "Regulars" light membership / multi-event pass
- Cafe-side view (their booked groups, headcount)

**COULD (v2):**
- Snapchat-style **live map** (events pinned w/ time + seats left)
- Positive re-pairing ("see them again") from feedback Q3
- Interest-based event themes

**WON'T (explicitly out for now — refuse scope creep):**
- Open UGC organizer marketplace (different product — §3 model A vs B)
- Public personality star-ratings (safety — reliability score only)
- Dating/romantic features (kills the platonic positioning)
- Multi-city at launch (density first)

**Platforms:** when built, start **one platform** (web/Next.js OR one mobile OS), not iOS + Android + web at once. Full native + web is post-traction.

**Pricing:** per-event, set by the organizer at event creation (NOT a global flat price). Model: `Event.pricePKR`.

## 18. DECISION LOG
- 2026-07-14: User chose to **build the product first**, skipping the concierge-first gate (§7). Risk flagged (build before validating rebook/referral). Recommendation on record: run 2–3 hand-matched events in parallel to de-risk. Proceeding to build.
- 2026-07-14: **Pricing is per-event** (organizer-set at creation), not flat/global.
- 2026-07-15: Stack locked — **Next.js web first · dedicated NestJS API · full product (incl. v2 map) as target, built in phases.** See `docs/architecture.md`.
- 2026-07-15: **Launch cohort = MIXED from the start** (women-only / men-only / mixed tracks all at launch), overriding earlier women-only-led lean. → `docs/recruitment-copy.md` needs a copy variant (currently women-only-led); gender track is a 3-value filter in matching (already designed for this).
- 2026-07-15: User chose **Full Phase 0+1 plan first → approval → implement**. Plan: `tasks/2026-07-15-phase-0-1-build-plan.md`.

---

# 12. v1 Intake Form (concierge — Google Form / Typeform)

**Design rules:** ~2–3 min, mobile-first, every field maps to a matching step or safety. `*` = required. `[maps to]` = matching purpose.

### A. Basics
1. First name + last initial * — ops
2. WhatsApp number * — primary contact channel in PK
3. Age * (number or band 18–24 / 25–34 / 35–44 / 45+) — `[filter: age band]`
4. Gender * (Woman / Man / Prefer not to say) — `[gender track]`

### B. Track & logistics (hard filters)
5. Which group would you like? * (Women-only / Men-only / Mixed / No preference) — `[HARD: gender track]`
6. City * (Islamabad / Lahore) — `[HARD: filter]`
7. Which areas can you reach? * (Islamabad: F-6/7/8, Blue Area, Bahria, DHA… / Lahore: Gulberg, DHA, Johar Town…) — `[HARD: location]`
8. Language you're most comfortable in * (Urdu / English / Both) — `[HARD-ish: language]`
9. When are you usually free? * (checkboxes: Weekday morning / Weekday evening / Sat / Sun × time slots) — `[HARD: availability]`

### C. About you (soft matching signals)
10. Pick your top 3–5 interests * (chips: Books · Startups/Business · Film & TV · Fitness · Food · Travel · Art & Design · Music · Faith/Deen · Gaming · Tech · Sports · Photography · Writing · +Other) — `[anchor]`
11. Which best describes you now? * (Student / Early-career / Professional / Business owner / Parent / Other) — `[anchor + diversity]`
12. In a *new* group, you usually… * (Listen & warm up slowly / A mix / Get the conversation going) — `[balance social energy]`
13. What are you hoping to get out of this? * (Make new friends / Meet people outside my bubble / Networking / I'm new to the city / Practice English) — multi-select — `[intent]`
14. Are you new to this city? (Yes — <6 months / Yes — 6–18 months / No) — `[newcomer flag]`

### D. Nice touches / inclusion
15. Coffee or chai? Any preference from the menu? (Coffee / Chai / Either) — logistics + culturally right for PK (offer **chai**, not coffee-only)
16. Any accessibility needs or things we should know? (optional free text) — inclusion

### E. Safety, consent, payment
17. CNIC verification * — "We verify every member for safety." (upload / or a follow-up WhatsApp step)
18. Agree to the Community Code of Conduct * (respect, platonic, no harassment) — checkbox — safety/legal
19. OK to be in event group photos? (Yes / No — please don't tag me) — consent
20. Preferred payment method * (Easypaisa / JazzCash / Bank transfer / Raast) — ops
21. How did you hear about us? (Instagram / Friend / Other) — attribution

> **Deliberately excluded:** dating/romantic intent (keep platonic), income/religion/ethnicity as *match* filters (safety + legal). Blocklist is built from post-event reports, not asked here.

---

# 13. Post-event Feedback Form (send via WhatsApp within 1–2 hrs)

**Design rules:** <60 seconds. This is the **training signal** for matching + the go/no-go metric.

1. How much did you enjoy today? * (1–5) — `[outcome signal]`
2. Would you want to meet this group again? * (Yes, all / Some of them / No) — `[chemistry signal]`
3. Anyone you'd love to see at a future meetup? (optional names) — `[positive pairing signal]`
4. The group *mix* felt… * (Too similar / Just right / Too different) — `[tunes 60/40 sweet spot]`
5. The group *size* felt… * (Too small / Just right / Too big) — `[tunes 6–8 target]`
6. Rate the cafe/venue * (1–5) — `[cafe selection]`
7. **Would you come to another meetup?** * (Yes / Maybe / No — if yes, how soon?) — `[GO/NO-GO: repeat intent]`
8. **Would you invite a friend to the next one?** * (Yes / No) — `[GO/NO-GO: referral]`
9. How likely are you to recommend us to a friend? * (0–10, NPS)
10. Did anything make you feel uncomfortable or unsafe today? * (No / Yes — tell us privately) — `[SAFETY: routes to report/blocklist]`
11. Anything we could do better? (optional free text)

> Attendance / no-shows are logged by the organizer (feeds the **reliability score**). Q7 + Q8 across ≥5 events = the §7 go/no-go gate.
