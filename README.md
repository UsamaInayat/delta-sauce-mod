# Delta Sauce Raffles

Custom raffle platform for Delta Sauce — Rafael-powered backend with the Win95 CRT UI from [deltasauceart.com/binary/allowlist](https://deltasauceart.com/binary/allowlist).

## Local setup

```bash
cp .env.example .env
npm install
npm run db:push      # create tables
npm run dev
```

- User: http://localhost:3000/raffles
- Admin: http://localhost:3000/admin/login (`sauce` / `letthesauceflow`)

Local dev uses the in-process raffle scheduler (long-running Node). On Vercel it is disabled automatically.

---

## Deploy on Vercel (recommended)

### Database (Neon)

1. Create Postgres on [Neon](https://neon.tech).
2. Set `DATABASE_URL` in Vercel (pooled URL is fine).

Build runs `prisma migrate deploy` when `DATABASE_URL` is set.

### Environment variables

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Neon Postgres URL |
| `SESSION_SECRET` | Long random string |
| `ADMIN_USERNAME` | Admin login user |
| `ADMIN_PASSWORD` | Admin login password |
| `CRON_SECRET` | Random string for `/api/cron/process` |
| `OPENSEA_PROXY_URL` | `https://sauce.deltasauceartist.workers.dev` |
| `ENS_RESOLVE_URL` | `https://api.ensideas.com/ens/resolve` |

---

## Why there is a cron at all

Originally (Rafael-style) a **5-second poller** auto-finalized raffles when `endsAt` passed — draw winners, FCFS close, token-gate purge — without an admin clicking **Finalize**.

You still need that **only when the site is empty at close time**. Everything else already runs without cron:

| Job | Where it runs |
|-----|----------------|
| Entries, FCFS full close | User entry API |
| Finalize while people use the site | `GET /api/raffles` and raffle detail |
| Finalize right after publish/edit | Admin API |

**Cron is the backup** for “raffle ended, zero visitors.”

Secondary: clear old raffle password hashes (`?maintenance=1`, rarely).

---

## External cron app — minimal cost

```http
GET https://your-domain.vercel.app/api/cron/process
Authorization: Bearer <CRON_SECRET>
```

**Best (cheapest): one job per raffle**

When you publish, the admin API returns `cronHint.pingAt` (ISO time ≈ `endsAt`). In your cron app, schedule **a single request at that time**. Most months = **0–1 Neon touches** from cron.

**Good fallback: once per day**

Example: `0 4 * * *` (04:00 UTC daily). Each run does one cheap `COUNT`; if nothing is past `endsAt`, it returns `{ skipped: true }` and almost no work.

**Password cleanup (optional):** `GET .../api/cron/process?maintenance=1` once a week.

Do **not** use every 1–5 minutes — that was the old cost problem and is unnecessary on Vercel.

---

## After deploy

1. `https://your-domain.vercel.app/admin/login`
2. Collections → publish raffles (note `cronHint` on publish)
3. Public: `/raffles`

---

## Token gating

- **Entry:** live wallet check against eligible collections
- **Finalize:** non-holders excluded before winners are drawn
- **Safety:** API failures never exclude a holder at finalize time

## Repo

https://github.com/UsamaInayat/delta-sauce-mod
