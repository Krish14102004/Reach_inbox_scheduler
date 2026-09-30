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
npm install @esbuild/win32-x64 --save-dev
## Decisions

- MySQL instead of PostgreSQL.
