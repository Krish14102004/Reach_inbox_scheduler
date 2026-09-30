<!--
  FILE: README.md
  PHASE: 9 - Hardening, Load Test, Docs & Submission
  PURPOSE: Final submission README: run backend/frontend, Ethereal + env setup, architecture (scheduling, restart persistence, rate limiting, concurrency), feature list, assumptions/trade-offs.
-->

# ReachInbox Scheduler

A local email scheduling app built with React/Vite, Express, Prisma/MySQL, BullMQ/Redis, and Elasticsearch. Messages are sent through per-user Ethereal test senders; they are not delivered to real inboxes.

## Requirements

- Node.js 20.12 or newer
- Docker Desktop with Docker Compose
- Google OAuth web client for login
- Optional Slack app for rate-limit notifications

## First Run (Windows PowerShell)

From the repository root:

```powershell
cmd /c npm install
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
cmd /c npm run docker:up
Push-Location backend
cmd /c npx prisma migrate deploy
cmd /c npm run prisma:generate
Pop-Location
```

Edit `backend/.env` locally. Keep secrets out of source control. Set `JWT_SECRET` to a random value of at least 32 characters, and configure:

- `DATABASE_URL=mysql://root:root@localhost:3307/reachinbox`
- `PORT=4001`
- `FRONTEND_URL=http://localhost:5173`
- Google client ID and secret, with redirect URI `http://localhost:4001/api/auth/google/callback`
- Optional Slack client ID/secret, with redirect URI `http://localhost:4001/api/slack/callback`

In Google Cloud, authorize `http://localhost:5173` as a JavaScript origin and `http://localhost:4001/api/auth/google/callback` as a redirect URI. In the Slack app, configure the matching callback URI and the OAuth scopes required by the integration. Set `VITE_API_PROXY_TARGET=http://localhost:4001` in `frontend/.env`.

If a local TLS inspection certificate prevents Ethereal SMTP from connecting, `ETHEREAL_ALLOW_SELF_SIGNED_CERTS=true` permits it **only in development**. Prefer trusting the relevant certificate authority; never enable this in production.

## Start the App

Run each command in its own PowerShell terminal from the repository root and keep the terminals open:

```powershell
cmd /c npm run dev --workspace @reachinbox/backend
```

```powershell
cmd /c npm run dev:worker --workspace @reachinbox/backend
```

```powershell
cmd /c npm run dev --workspace @reachinbox/frontend
```

Open `http://localhost:5173`. Use one API process and one worker; starting duplicate backend watchers causes `EADDRINUSE` on port 4001. Check API/database/Redis with `Invoke-RestMethod http://localhost:4001/health`.

## Use

1. Sign in with Google.
2. Compose a message, add recipients manually or upload CSV/TXT, set a future time, delay, and hourly limit, then select **Send Later**.
3. Watch Scheduled and Sent in the dashboard. Worker logs include the Ethereal preview URL for successful test sends.
4. Connect Slack to receive a deduplicated rate-limit alert. Search is backed by Elasticsearch; `/admin/queues` is protected by the app session.

## Operations

- Generate the Prisma client: `cmd /c npm run prisma:generate --workspace @reachinbox/backend`
- Apply pending migrations: `Push-Location backend; cmd /c npx prisma migrate deploy; Pop-Location`
- Rebuild the search index: `cmd /c npm run search:reindex --workspace @reachinbox/backend`
- Create additional Ethereal senders: `cmd /c npm run senders:create --workspace @reachinbox/backend -- <userId> [count]`
- Queue a load test (up to 5,000 recipients): `cmd /c npm run load:test --workspace @reachinbox/backend -- <userId> [count] [hourlyLimit]`
- Backend typecheck/tests: `cmd /c npm run --workspace @reachinbox/backend typecheck` and `cmd /c npm run --workspace @reachinbox/backend test`
- Backend and frontend lint: `cmd /c npm run --workspace @reachinbox/backend lint` and `cmd /c npm run --workspace @reachinbox/frontend lint`
- Frontend production build: `cmd /c npm run --workspace @reachinbox/frontend build`

`docker compose down` preserves named database/queue/index volumes. `docker compose down -v` deletes them; use it only when intentionally resetting all local data.

## Current Verification

Verified locally: Google login, API health, one Ethereal send, a worker restart followed by a successful send, full test suite (18/18 passing unit and restart-persistence integration tests), backend/frontend lints (0 errors), and frontend production build. The hourly-limit UI test is sensitive to previous sends by the same sender in the current UTC hour; use a clean sender/window for a predictable demonstration. Live Slack notification delivery and simultaneous multi-worker load behavior remain documented as unverified without active external credentials/load run.
