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

---

## Deploy on Railway (recommended)

### Step 1 — Create Railway project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select **UsamaInayat/delta-sauce-mod**.

Railway will detect Next.js and start a first deploy (it may fail until the database is added — that's normal).

### Step 2 — Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**.
2. Wait for Postgres to finish provisioning.

### Step 3 — Connect database to the web service

1. Click your **web service** (the Next.js app, not Postgres).
2. Go to **Variables** tab.
3. Click **+ New Variable** → **Add Reference**.
4. Select the Postgres service → choose **`DATABASE_URL`**.
5. Save.

Railway injects `DATABASE_URL` into your app automatically.

### Step 4 — Add remaining environment variables

Still in the web service **Variables** tab, add:

| Variable | Value |
|----------|--------|
| `SESSION_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |
| `ADMIN_USERNAME` | `sauce` |
| `ADMIN_PASSWORD` | `letthesauceflow` |
| `CRON_SECRET` | Another random string |
| `OPENSEA_PROXY_URL` | `https://sauce.deltasauceartist.workers.dev` |
| `ENS_RESOLVE_URL` | `https://api.ensideas.com/ens/resolve` |
| `NODE_ENV` | `production` |

### Step 5 — Redeploy

1. Go to **Deployments** on the web service.
2. Click **Redeploy** (or push any commit to trigger a new deploy).

On deploy, Railway runs:
- **Build:** `prisma generate && next build`
- **Release:** `prisma migrate deploy` (creates all tables)
- **Start:** `next start`

Check deploy logs for `Applying migration` — that confirms tables were created.

### Step 6 — Public URL

1. Web service → **Settings** → **Networking** → **Generate Domain**.
2. You'll get something like `delta-sauce-mod-production.up.railway.app`.

### Step 7 — Add collections & create raffles

1. Open `https://your-domain.up.railway.app/admin/login`
2. Login: **sauce** / **letthesauceflow**
3. **Snapshots** tab → Add Collection (name, contract address, chain)
4. **Create Raffle** tab → build and publish a raffle
5. User side: `/raffles`

### Step 8 — Cron (auto-finalize raffles)

Raffles need a periodic job to go live and auto-finalize. Options:

**Option A — Railway Cron (paid plans)**  
Add a cron service that hits your endpoint every minute:

```
GET https://your-domain.up.railway.app/api/cron/process
Authorization: Bearer YOUR_CRON_SECRET
```

**Option B — Free external cron**  
Use [cron-job.org](https://cron-job.org) or similar:
- URL: `https://your-domain.up.railway.app/api/cron/process`
- Schedule: every 1 minute
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## Token gating

- **Go-live:** snapshots eligible collections via OpenSea proxy
- **Entry:** realtime on-chain hold check + go-live snapshot match
- **Finalize:** non-holders purged before winner draw

## Repo

https://github.com/UsamaInayat/delta-sauce-mod
