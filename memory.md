<!--
  memory.md — LIVING PROGRESS LOG (intentionally empty at the start of the project)

  PURPOSE
  This file is the project's short-term memory. Any human or AI assistant must read it
  at the start of a session and update it regularly (after every meaningful chunk of work,
  at the end of each session, and whenever a phase changes).

  IT SHOULD INCLUDE
  1. Current phase        — which phase from phases.md is active (e.g. "Phase 3 — Core Scheduler").
  2. Currently working on — the exact file(s) in progress (full path) and what is left in them.
  3. Completed            — files/features/tasks that are DONE and verified (lint, types, tests, manual check).
  4. Next steps           — the next 1-3 concrete actions.
  5. Decisions made       — choices that deviate from or refine the docs (also copy to docs/assumptions-and-tradeoffs.md).
  6. Blockers / questions — missing credentials, unreadable Figma frames, unclear requirements.
  7. Verification notes   — what was actually run and its result ("not verified" if not run).

  SUGGESTED FORMAT (add below this comment when work begins)
  ## Current status
  - Phase:
  - Working on:
  - Last updated:

  ## Completed
  - [ ] ...

  ## Next steps
  1. ...

  ## Decisions
  - ...

  ## Blockers
  - ...

  KEEP IT SHORT AND CURRENT: delete stale items; history belongs in git commits.
-->

alright

## Current status

- Phase: Local implementation is in place; Phase 9 verification/submission remains
- Working on: handoff checklist below; last known API, Vite, and worker processes were running
- Last updated: 2026-09-30

## Completed

- [x] Workspace configured as npm workspaces with backend/frontend split
- [x] MySQL chosen as the database provider; server and schema updated accordingly
- [x] Docker infra configured for MySQL, Redis, and Elasticsearch
- [x] Backend foundation booted successfully with Express and Prisma/Redis startup
- [x] Backend health endpoint is running and app starts successfully after clearing the stale port conflict
- [x] Time-window helper logic implemented and verified with a passing unit test
- [x] TypeScript compile passes on the backend after the latest fixes
- [x] Sender repository/service/routes implemented and wired into the app
- [x] Email repository and rate-limit primitives implemented
- [x] Processor claims scheduled rows with a conditional DB update; duplicate-delivery regression passes
- [x] Startup reconciler restores future-dated scheduled jobs with their remaining delay and runs before API listen
- [x] SMTP delivery uses stored per-sender Ethereal credentials; batch/email writes are transactional and enqueue is bulk/idempotent
- [x] Hourly rate limit, per-sender send gate, ranked deferral, and worker Redis lifecycle are wired into email processing
- [x] Prisma Client regenerated with workspace Prisma 6.19.3; API health reports DB and Redis `ok`
- [x] Applied the initial MySQL migration after startup reconciliation exposed missing tables; migration status is up to date
- [x] Cleaned duplicate backend watchers and restarted one API process after confirming recurring port contention
- [x] Implemented screenshot-based login, mailbox, detail, search, Slack controls, and compose/schedule UI
- [x] Implemented frontend shared UI primitives, layout/auth guards, typed hooks, CSV utilities, and feature wrappers
- [x] Aligned frontend API traffic to the Vite proxy on port 4001 and Google OAuth callback to port 4001
- [x] Implemented Slack OAuth/alerts, Elasticsearch indexing/reindex, authenticated Bull Board, and load-test CLI
- [x] Completed fresh-run README, demo script, assumptions/trade-offs, and aligned example ports with Docker/local config
- [x] Redacted cookie and authorization headers from request logs
- [x] Implemented and verified `backend/tests/integration/restart-persistence.test.ts` (covers reconciler startup recovery, stale processing reset, and idempotent delivery)
- [x] Fixed ESLint errors across backend (`search.controller.ts`) and frontend (`DashboardPage.tsx`); both backend and frontend lints pass cleanly (0 errors)

## Next steps

1. Rotate `JWT_SECRET` locally if not already done; do not paste secrets into chat.
2. Run `backend/scripts/load-test.ts` against active Docker infrastructure when needed and record throughput/ordering observations.
3. Verify live Slack delivery and multi-worker behavior when live Slack app credentials/environments are available.
4. Record demo video (<= 5 min) following `docs/demo-script.md`, grant private repository access to `Mitrajit` and `Yadav036`, and submit the ClickUp form.

## Decisions

- MySQL on localhost:3307 via Docker, matching the docker-compose ports
- Backend runs on port 4001 when the port conflict is resolved; environment is expected to match the live local config
- Use real app startup verification rather than guessing; port conflicts are resolved before continuing

## Blockers

- Google OAuth callback is authorized and browser login round-trip has succeeded
- Slack OAuth credentials are configured locally; live Slack delivery and multi-worker limiting remain unverified live
- Rotate `JWT_SECRET` if not already done; do not paste secrets or full request logs into chat

## Verification notes

- Verified: `npm run --workspace @reachinbox/backend typecheck` succeeded (0 errors)
- Verified: `npm run --workspace @reachinbox/backend lint` succeeded (0 errors)
- Verified: `npm run --workspace @reachinbox/frontend lint` succeeded (0 errors)
- Verified: `npm run --workspace @reachinbox/frontend build` succeeded (0 errors, production build created)
- Verified: all 9 backend test files passed (18/18 tests), including unit test suites and `restart-persistence.test.ts`
- Verified: live Ethereal message sent and moved to Sent; worker restart test also sent successfully
- Verified: hourly-limit batch stored limit=1 and sent across subsequent UTC windows
- Verified: frontend OAuth proxy returned 302 to Google with callback URI on port 4001
- Verified: Google sign-in returned to the dashboard successfully
- Verified: backend `/health` reports API, DB, and Redis as `ok`; frontend returns HTTP 200 on port 5173
- Verified: BullMQ worker logged `Email worker started`
- Verified: `prisma migrate deploy` applied `20260930000000_init`; `prisma migrate status` reports schema up to date
- Verified: server logged startup on port 4001; `GET /health` returned status, DB, and Redis as `ok`
- Verified: request log serializer now redacts cookie and authorization headers
- Note: VS Code still reports a Prisma 7 schema diagnostic although workspace Prisma CLI/client are 6.19.3; CLI schema loading and backend startup succeed. This is an editor version mismatch, not a runtime failure.
- Note: the most recent backend startup failure was caused by the pending initial migration (missing `ScheduledEmail`), while separate `EADDRINUSE` failures came from concurrent dev-server launches. Keep only one backend watcher running.
- Handoff: backend typecheck, all 18 backend tests (unit + restart persistence integration), frontend lint, and frontend production build are green. Live external Slack webhook delivery and concurrent multi-worker rate limiting remain documented as unverified/externally dependent.
