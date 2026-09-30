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

## Current status

- Phase: Phase 3 — Core Scheduler (incomplete); Phase 4 work is not yet verified end to end
- Working on: backend queue claiming and restart reconciliation, then remaining Phase 3 and Phase 4 behavior
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
- [x] Startup reconciler restores future-dated scheduled jobs with their remaining delay
- [x] Prisma Client regenerated with workspace Prisma 6.19.3; API health reports DB and Redis `ok`

## Next steps

1. Complete and verify the remaining Phase 3 queue, Ethereal send, retry, and restart behavior
2. Complete Phase 4 atomic hourly limiting, send gate, and ordered rescheduling
3. Run phase-scoped tests before moving to later phases

## Decisions

- MySQL on localhost:3307 via Docker, matching the docker-compose ports
- Backend runs on port 4001 when the port conflict is resolved; environment is expected to match the live local config
- Use real app startup verification rather than guessing; port conflicts are resolved before continuing

## Blockers

- None blocking at the moment; backend is running and verified with the relevant typecheck/test command

## Verification notes

- Verified: `npm run --workspace @reachinbox/backend typecheck` succeeded after Prisma Client regeneration
- Verified: `npm run --workspace @reachinbox/backend test -- --run tests/unit/time.test.ts` passed with 3/3 tests passing
- Verified: focused processor and reconciler tests passed (2/2)
- Verified: `GET /health` returned status, DB, and Redis as `ok`
- Note: VS Code still reports a Prisma 7 schema diagnostic although workspace Prisma CLI/client are 6.19.3; CLI schema loading and backend startup succeed. This is an editor version mismatch, not a runtime failure.
