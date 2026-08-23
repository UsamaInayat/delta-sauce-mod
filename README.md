# Delta Sauce Raffles

Custom raffle platform for Delta Sauce — Rafael-powered backend logic with the exact Win95 CRT UI from [deltasauceart.com/binary/allowlist](https://deltasauceart.com/binary/allowlist).

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` + `SESSION_SECRET`.
2. Install: `npm install`
3. Database: `npm run db:push` (or `npm run db:migrate`)
4. Seed collections: `npm run db:seed`
5. Dev server: `npm run dev`

## Admin

- URL: `/admin/login`
- Username: `sauce` (or `ADMIN_USERNAME` in env)
- Password: `letthesauceflow` (or `ADMIN_PASSWORD` in env)

Tabs: **Create Raffle**, **Winners**, **Snapshots**, **Saved Raffles**

## User

- `/raffles` — horizontal raffle cards by section (Live / Upcoming / Past)
- `/raffles/[slug]` — README details + entry form (ENS resolve, X handle, update/cancel)

## Cron

Hit `GET /api/cron/process` on a schedule (e.g. Vercel Cron) to auto-go-live snapshots, auto-finalize ended raffles, and close FCFS when full. Optional `Authorization: Bearer $CRON_SECRET`.

## Token gating

- On **publish → live**: snapshots eligible collections via OpenSea proxy
- On **entry**: realtime on-chain hold check + go-live snapshot match
- On **finalize**: non-holders purged before draw

## Collections

Add real contract addresses via **Admin → Snapshots → Add Collection**, or update `prisma/seed.ts`.
