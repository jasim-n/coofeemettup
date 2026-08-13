# Deploying on free resources

Everything below is **free, no credit card**, and deploys via each host's **GitHub
integration** (their CI/CD) — no deploy CLI.

## The stack

| Piece | Host | Status |
|---|---|---|
| Database (Postgres) | **Neon** free tier | ✅ already live (has data) |
| Redis (OTP/cache) | **Upstash** free tier | ✅ already live |
| API (NestJS) | **Render** free web service | deploy below |
| Web (Next.js) | **Vercel** free hobby | deploy below |

Grab the two connection strings you'll need from `apps/api/.env` (gitignored) or the
Neon/Upstash dashboards:
- `DATABASE_URL` — Neon **pooled** string (`...-pooler...?sslmode=require`)
- `REDIS_URL` — Upstash `rediss://...`

> Free-tier caveat: the Render API **sleeps after ~15 min idle**; the first request
> then cold-starts (~30–60s). Fine for a pilot. Neon also auto-suspends and wakes fast.

---

## Step 1 — API on Render

1. Go to **render.com** → sign in **with GitHub** (free, no card).
2. **New → Blueprint** → pick the `jasim-n/coofeemettup` repo. Render reads
   [`render.yaml`](../render.yaml) and creates the `jrst-api` web service.
3. In the service's **Environment**, set the `sync:false` vars:
   - `DATABASE_URL` = your Neon pooled URL
   - `REDIS_URL` = your Upstash URL
   - `BREVO_API_KEY` = your Brevo API v3 key (HTTPS email sending)
   - `WEB_ORIGIN` = `https://REPLACE-ME.vercel.app` (put a placeholder now; fix in Step 3)
   - `API_ORIGIN` = the URL Render shows for this service (e.g. `https://jrst-api.onrender.com`)
   - (`SESSION_SECRET` and `PAYMENTS_WEBHOOK_SECRET` auto-generate.)
4. Deploy. When it's up, open **`https://<your-api>.onrender.com/api/health`** → should return
   `{"status":"ok","db":"up",...}`. **Copy the API URL.**

Migrations are applied out-of-band against the Neon database before deploying.
Do not add `prisma migrate deploy` to Render's start command: the pooled Neon
connection can time out while acquiring Prisma's advisory lock. The Neon DB is
already migrated + seeded, so the Render service should only start the compiled
API.

---

## Step 2 — Web on Vercel

1. Go to **vercel.com** → sign in **with GitHub** (free, no card).
2. **Add New → Project** → import `jasim-n/coofeemettup`.
3. Set **Root Directory = `apps/web`** (Framework auto-detects as Next.js; leave build/install
   as default — Vercel handles the pnpm workspace).
4. Add an **Environment Variable**:
   - `NEXT_PUBLIC_API_URL` = the API URL from Step 1 (e.g. `https://jrst-api.onrender.com`)
5. Deploy. **Copy the production URL** (e.g. `https://coofeemettup.vercel.app`).

---

## Step 3 — Wire the origins together

1. Back in **Render → jrst-api → Environment**, set `WEB_ORIGIN` to the exact Vercel URL from
   Step 2 (no trailing slash). You can add multiple (prod + a custom domain) comma-separated.
2. **Manual Deploy → Deploy latest** (or just save — Render redeploys).

This matters: web and API are on **different domains**, so the login/session cookie uses
`SameSite=None; Secure` in production and the API's CORS must name the Vercel origin. If auth
"doesn't stick" after login, it's almost always a `WEB_ORIGIN` mismatch here.

---

## Step 4 — Verify

- Open the Vercel URL → **sign in with a phone number** → the dev OTP shows on screen (no SMS
  provider wired yet) → Verify → you should land on Home and stay logged in on refresh.
- Make yourself **admin/host**: the seed admin is `+923001112222`. To grant host to any account,
  sign in as an admin and use **Admin → Host access**, or run one SQL update in Neon:
  `UPDATE "User" SET "role"='ADMIN', "canHost"=true WHERE phone='+92300...';`

---

## What works vs what still needs your accounts

**Works on the free deploy:** phone-OTP auth (dev code on screen), profiles, **Tables** (host,
approval join, chat, reviews, nearby map, discover), notifications, admin console, free tables.

**Still needs a real provider (go-live):**
- **Payments** — the mock checkout is disabled in production, so the Events "pay" flow and *paid*
  tables won't complete until a real PK gateway is wired (Safepay/Easypaisa/JazzCash/Raast).
- **SMS OTP** — codes are shown on screen (dev mode); wire a real SMS provider to hide them.
- **CNIC verification** — manual/KYC provider decision.

All three are seams — swapping them in doesn't touch the rest.

---

## Auto-deploy from here on

Both hosts watch `main` — every `git push` redeploys automatically. That's the CI/CD path; no CLI.
