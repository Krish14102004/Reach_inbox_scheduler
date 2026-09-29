# Phases — Build Plan

> Work strictly in order unless the user approves otherwise. Each phase ends with its **Exit criteria** met, then update `memory.md`.
> File lists below are generated from the scaffold; each file's header comment repeats its phase.

**Time budget (48h total, suggested):** P0 1h · P1 2h · P2 2h · P3 6h · P4 5h · P5 3h · P6 3h · P7 3h · P8 8h · P9 6h = **~39h**, leaving ~9h buffer.

**Critical path:** P0 → P1 → P3 → P4 (the graded core). P2 unblocks the frontend login. P5/P6 are required but build on the working core. P7/P8 can start after P2 + P3 APIs exist.

---

## Phase 0 — Project Setup & Infrastructure  (13 files)
**Goal:** repo boots, infra runs, tooling enforced.
**Tasks**
1. Init git repo (private), npm workspaces (`backend`, `frontend`).
2. `docker-compose.yml`: MySQL, Redis (AOF on), Elasticsearch single-node.
3. Backend/Frontend `package.json`, `tsconfig.json`, ESLint (ban cron libs), `.env.example` files.
4. Vite + Tailwind + React skeleton compiles.

**Files**
- `package.json` — Root npm workspaces config (backend + frontend). Shared scripts: dev, build, lint, test, docker:up, docker:down.
- `.gitignore` — Ignore node_modules, dist, .env files, coverage, docker volumes, OS/editor files. Never commit secrets.
- `docker-compose.yml` — Local infra: MySQL, Redis (with AOF persistence enabled), Elasticsearch (single node). Named volumes so data survives restarts.
- `backend/package.json` — Backend dependencies and scripts: dev (API), dev:worker, build, start, start:worker, prisma:*, test, lint.
- `backend/tsconfig.json` — Strict TypeScript config for Node (ES2022, NodeNext, strict, noUncheckedIndexedAccess).
- `backend/eslint.config.js` — ESLint flat config: typescript-eslint, no-explicit-any, no-floating-promises. Ban cron libraries via no-restricted-imports.
- `backend/.env.example` — Documented template of ALL backend env vars: DB, Redis, ES, JWT/cookie, Google OAuth, Slack OAuth, WORKER_CONCURRENCY, MIN_DELAY_BETWEEN_EMAILS_MS, MAX_EMAILS_PER_HOUR_PER_SENDER, etc.
- `frontend/package.json` — Frontend deps: react, react-dom, react-router-dom, @tanstack/react-query, tailwindcss, sonner (toasts), papaparse, zod, lucide-react. Scripts: dev, build, lint, preview.
- `frontend/tsconfig.json` — Strict TS config for Vite + React (jsx: react-jsx, path alias @/* -> src/*).
- `frontend/vite.config.ts` — Vite config: react plugin, tailwind plugin, @ alias, dev proxy /api -> backend to keep cookies same-site.
- `frontend/eslint.config.js` — ESLint flat config for React + hooks rules + typescript-eslint.
- `frontend/.env.example` — VITE_API_BASE_URL (and nothing secret — frontend env is public).
- `frontend/index.html` — Vite HTML shell: #root, font <link>s from design.md, title, favicon.

**Exit criteria:** `docker compose up -d` healthy; `npm run lint` and `tsc --noEmit` pass in both packages.

---

## Phase 1 — Backend Foundation  (15 files)
**Goal:** a well-structured, observable Express app with DB.
**Tasks**
1. Zod env loader; logger; Prisma schema + first migration; Redis factory.
2. `app.ts`, `server.ts`, central router, error classes, `errorHandler`, `notFound`, `validate`, `asyncHandler`, request logging.
3. `/health` reporting DB + Redis (+ ES later).

**Files**
- `backend/prisma/schema.prisma` — Database schema: User, Sender, EmailBatch, ScheduledEmail (status, scheduledAt, sentAt, idempotencyKey UNIQUE, senderId, attempts), SlackConnection. Indexes on (status, scheduledAt) and (userId, status).
- `backend/src/server.ts` — API process entrypoint: boots Express, connects Prisma/Redis, runs startup reconciler, mounts Bull Board, handles graceful shutdown (SIGTERM/SIGINT).
- `backend/src/app.ts` — Express app factory: helmet, cors (credentials), cookie-parser, JSON body limit, request logger, routes, notFound + central error handler.
- `backend/src/routes.ts` — Central router: mounts /api/auth, /api/emails, /api/senders, /api/slack, /api/search, /health.
- `backend/src/config/env.ts` — Zod-validated environment loader. Fails fast at boot with a readable error. Single typed `env` export; no process.env elsewhere.
- `backend/src/config/constants.ts` — Non-secret constants: queue names, Redis key prefixes, status enums, cookie name, ES index name.
- `backend/src/lib/logger.ts` — Pino logger (pretty in dev, JSON in prod) with child-logger helper for modules/jobs.
- `backend/src/lib/prisma.ts` — Singleton PrismaClient + disconnect helper.
- `backend/src/lib/redis.ts` — ioredis connection factories. BullMQ needs maxRetriesPerRequest=null; separate connections for queue, worker, general use.
- `backend/src/lib/errors.ts` — AppError base class + BadRequest/Unauthorized/Forbidden/NotFound/Conflict subclasses carrying HTTP status + machine-readable code.
- `backend/src/lib/asyncHandler.ts` — Wrapper that forwards rejected promises from async route handlers to the error middleware.
- `backend/src/middleware/errorHandler.ts` — Central error middleware: maps AppError/ZodError/Prisma errors to a uniform JSON envelope {error:{code,message,details}}. Never leaks stack traces in prod.
- `backend/src/middleware/notFound.ts` — 404 handler for unknown routes.
- `backend/src/middleware/requestLogger.ts` — pino-http request/response logging with request id.
- `backend/src/middleware/validate.ts` — Generic zod validation middleware for body/query/params; attaches typed result to req.

**Exit criteria:** server starts, `/health` OK, bad input returns the standard error envelope, migration applied.

---

## Phase 2 — Authentication (Google OAuth)  (7 files)
**Goal:** real Google login with cookie session.
**Tasks**
1. Google Cloud OAuth client; auth URL with `state`; callback; ID-token verification; upsert user.
2. JWT httpOnly cookie; `requireAuth`; `/me`; `/logout`.

**Files**
- `backend/src/middleware/requireAuth.ts` — Verifies session cookie (JWT), loads user, attaches req.user; 401 otherwise.
- `backend/src/modules/auth/auth.routes.ts` — GET /api/auth/google (start), GET /api/auth/google/callback, GET /api/auth/me, POST /api/auth/logout.
- `backend/src/modules/auth/auth.controller.ts` — HTTP layer for auth routes: redirects, sets/clears httpOnly cookie, returns current user.
- `backend/src/modules/auth/auth.service.ts` — Exchange Google auth code -> verify ID token -> upsert user -> issue session JWT.
- `backend/src/modules/auth/google.client.ts` — google-auth-library OAuth2 client wrapper (auth URL with state, token exchange, ID-token verification).
- `backend/src/modules/auth/session.ts` — Sign/verify session JWT and cookie options (httpOnly, sameSite, secure in prod).
- `backend/src/modules/users/users.repository.ts` — Prisma queries for User: upsertByGoogleId, findById.

**Exit criteria:** browser login round-trip works; `/api/auth/me` returns user; protected route returns 401 without cookie.

---

## Phase 3 — Core Scheduler (BullMQ + Ethereal)  (18 files)
**Goal:** schedule → persist → delayed job → send → mark sent; restart-safe and idempotent.
**Tasks**
1. Ethereal senders script + sender service.
2. `schedule.calculator` (pure) + unit tests.
3. `POST /api/emails/schedule` (transaction + `addBulk` with `jobId=emailId`).
4. Worker + processor with atomic claim, retries/backoff, mark sent/failed.
5. Reconciler at boot; list endpoints (`scheduled`, `sent`).

**Files**
- `backend/src/worker.ts` — Worker process entrypoint: starts BullMQ email worker (configurable concurrency), graceful close on shutdown. Separate from API so it can be scaled/restarted independently.
- `backend/src/lib/mailer.ts` — Nodemailer transport factory per Ethereal sender (cached by senderId). Exposes sendMail() returning messageId + preview URL.
- `backend/src/modules/senders/senders.repository.ts` — Prisma queries for Sender (Ethereal SMTP creds): listByUser, findById.
- `backend/src/modules/senders/senders.service.ts` — Ensure a user has senders (creates Ethereal test accounts on demand); round-robin selection helper.
- `backend/src/modules/senders/senders.routes.ts` — GET /api/senders (list) and POST /api/senders (create Ethereal sender).
- `backend/src/modules/emails/emails.routes.ts` — POST /api/emails/schedule, GET /api/emails/scheduled, GET /api/emails/sent (paginated, auth required).
- `backend/src/modules/emails/emails.controller.ts` — HTTP layer: parse validated input, call service, shape responses.
- `backend/src/modules/emails/emails.service.ts` — Orchestrates scheduling: validate -> compute schedule -> DB transaction (batch + emails) -> enqueue BullMQ delayed jobs -> index in ES. Queries for tables.
- `backend/src/modules/emails/emails.repository.ts` — Prisma queries: bulk create emails, atomic status transitions (claim scheduled->processing), mark sent/failed, list by status with pagination.
- `backend/src/modules/emails/emails.schema.ts` — Zod schemas: schedule request (subject, body, leads[], startTime, delayBetweenMs, hourlyLimit) and list query params.
- `backend/src/modules/emails/emails.types.ts` — Shared TS types/DTOs for emails (ScheduledEmailDTO, SentEmailDTO, EmailStatus).
- `backend/src/modules/emails/schedule.calculator.ts` — PURE function: given leads, startTime, delay, senders -> per-email scheduledAt + sender assignment (round-robin). Heavily unit-tested.
- `backend/src/queue/queue.connection.ts` — BullMQ connection options + default job options (attempts, exponential backoff, removeOnComplete policy).
- `backend/src/queue/email.queue.ts` — BullMQ Queue instance + addEmailJobs(): bulk add delayed jobs with deterministic jobId = emailId (idempotent enqueue).
- `backend/src/queue/email.worker.ts` — BullMQ Worker factory: concurrency from env, limiter (global throttle), failure/completed event hooks, stalled-job handling.
- `backend/src/queue/email.processor.ts` — Job handler: claim email atomically -> rate-limit + send-gate check (P4) -> send via Ethereal -> mark sent -> update ES. Idempotent: skips if already sent/processing.
- `backend/src/queue/reconciler.ts` — Runs once at startup (NOT cron): re-enqueues DB emails still `scheduled` but missing a BullMQ job; resets stuck `processing` rows. Guarantees restart safety.
- `backend/scripts/create-ethereal-senders.ts` — CLI: creates N Ethereal accounts via nodemailer.createTestAccount() and stores them as Senders for a user.

**Exit criteria:** schedule 10 emails 30 s apart → all sent on time (visible on Ethereal); kill worker mid-run and restart → remaining sent once; DB shows no duplicates.

---

## Phase 4 — Rate Limiting, Delay & Concurrency  (4 files)
**Goal:** behave like a real provider under load.
**Tasks**
1. `time.ts` window helpers (+ tests).
2. Redis Lua hourly limiter per sender; safe across workers.
3. Send-gate (min delay) using `SET NX PX`; re-delay instead of blocking.
4. Rescheduler → next window with rank offset; update `scheduledAt`; never fail/drop.
5. `WORKER_CONCURRENCY`, `MIN_DELAY_BETWEEN_EMAILS_MS`, `MAX_EMAILS_PER_HOUR_PER_SENDER` wired from env; per-batch override capped.

**Files**
- `backend/src/lib/time.ts` — Time helpers: hour-window key (UTC floor to hour), next-window start, ms-until helpers. Pure functions, unit-tested.
- `backend/src/rate-limit/rateLimiter.ts` — Redis-backed hourly limiter keyed by sender + hour window. Atomic Lua INCR-if-below. Returns {allowed, nextWindowStart}. Safe across many workers/instances.
- `backend/src/rate-limit/sendGate.ts` — Per-sender minimum delay between sends (Redis SET NX PX). Returns ms to wait; processor re-delays the job instead of blocking the worker.
- `backend/src/rate-limit/rescheduler.ts` — Moves a rate-limited job to the next hour window (job.moveToDelayed + DelayedError) with rank-based offset to preserve ordering; updates scheduledAt in DB. Never drops or fails jobs.

**Exit criteria:** limit=5, schedule 12 → 5 send, 7 roll into next window(s) in order; two worker processes together never exceed the limit; delay between sends ≥ configured value.

---

## Phase 5 — Slack Integration  (5 files)
**Goal:** real OAuth connect + live message on rate-limit hit.
**Tasks**
1. Slack app (OAuth v2, `chat:write` / incoming-webhook); connect/callback/status/disconnect.
2. `SlackConnection` storage per user.
3. `notifier`: post real message; dedupe per sender per window; no-op when not connected; wired into rescheduler.

**Files**
- `backend/src/modules/slack/slack.routes.ts` — GET /api/slack/connect (start OAuth), GET /api/slack/callback, GET /api/slack/status, DELETE /api/slack/disconnect.
- `backend/src/modules/slack/slack.controller.ts` — HTTP layer for Slack connect/callback/status/disconnect.
- `backend/src/modules/slack/slack.service.ts` — Slack OAuth v2 code exchange, store token/webhook per user, revoke on disconnect.
- `backend/src/modules/slack/slack.repository.ts` — Prisma queries for SlackConnection (upsert, findByUser, delete).
- `backend/src/modules/slack/slack.notifier.ts` — notifyRateLimitHit(userId, sender, window, nextWindow): posts a REAL Slack message; no-op (no crash) if not connected; deduped once per sender per window via Redis flag.

**Exit criteria:** connect in browser; trigger limit → message appears in Slack; disconnected user → no crash; connect later → works without redeploy.

---

## Phase 6 — Search (Elasticsearch) & Queue Dashboard  (7 files)
**Goal:** searchable emails + live queue visibility.
**Tasks**
1. ES client, mapping, `ensureIndex` at boot; index on schedule, update on status change (best effort).
2. `GET /api/search/emails`; reindex script.
3. Mount Bull Board at `/admin/queues` behind auth.

**Files**
- `backend/src/queue/bullBoard.ts` — Mounts Bull Board (@bull-board/express) at /admin/queues behind requireAuth for live queue visibility.
- `backend/src/lib/elasticsearch.ts` — Elasticsearch client singleton + health check.
- `backend/src/search/mapping.ts` — Index name + mapping/settings for the `emails` index (email, subject, body, status, senderId, userId, scheduledAt, sentAt).
- `backend/src/search/indexer.ts` — ensureIndex(), indexEmail(), updateEmailStatus(), bulkIndex(). Called from service + processor; failures logged, never block sending.
- `backend/src/modules/search/search.routes.ts` — GET /api/search/emails?q=&status=&page= (auth required).
- `backend/src/modules/search/search.controller.ts` — Validates query, calls ES search scoped to the current user, returns paginated hits.
- `backend/scripts/reindex-elasticsearch.ts` — CLI: rebuilds the ES index from MySQL (recovery + initial backfill).

**Exit criteria:** search by recipient/subject returns results; Bull Board shows live jobs; ES down ≠ sending broken.

---

## Phase 7 — Frontend Foundation  (27 files)
**Goal:** design system + app shell before features.
**Prereq:** `design.md` tokens filled from Figma.
**Tasks**
1. Tailwind theme from tokens; fonts.
2. API client, shared types, formatters, `cn`.
3. Reusable UI: Button, Input, Textarea, DateTimeInput, FileDropzone, Modal, Table, Tabs, Badge, Avatar, Spinner, EmptyState, Toaster.
4. Layout: Header, DashboardLayout; providers + routes skeleton.

**Files**
- `frontend/src/main.tsx` — React entry: mounts <App/> with StrictMode.
- `frontend/src/App.tsx` — Composes providers (QueryClientProvider, AuthProvider, Toaster, Router).
- `frontend/src/routes/AppRoutes.tsx` — Route table: /login (public), / (protected dashboard), * (not found).
- `frontend/src/styles/index.css` — Tailwind import + base styles + global resets.
- `frontend/src/styles/theme.css` — Design tokens as CSS variables / Tailwind @theme (colors, fonts, radii, shadows) copied from Figma per design.md.
- `frontend/src/api/client.ts` — Single fetch wrapper: base URL, credentials:'include', JSON handling, normalises backend error envelope into ApiError.
- `frontend/src/types/api.types.ts` — Generic API types: Paginated<T>, ApiErrorBody.
- `frontend/src/types/user.types.ts` — User (id, name, email, avatarUrl).
- `frontend/src/types/email.types.ts` — EmailStatus union, ScheduledEmail, SentEmail, ScheduleEmailsPayload.
- `frontend/src/lib/cn.ts` — className joiner (clsx + tailwind-merge).
- `frontend/src/lib/formatters.ts` — Date/time + status formatting helpers used by tables.
- `frontend/src/components/ui/Button.tsx` — Reusable button: variants (primary/secondary/ghost), sizes, loading state.
- `frontend/src/components/ui/Input.tsx` — Labeled text/number input with error message slot.
- `frontend/src/components/ui/Textarea.tsx` — Labeled textarea with error slot.
- `frontend/src/components/ui/DateTimeInput.tsx` — Date-time picker for start time (matches Figma).
- `frontend/src/components/ui/FileDropzone.tsx` — Drag/drop or click file upload for CSV/TXT with filename display.
- `frontend/src/components/ui/Modal.tsx` — Accessible modal (focus trap, esc to close) used by Compose.
- `frontend/src/components/ui/Table.tsx` — Generic typed table primitives (Table, Th, Td, Row) for both email tables.
- `frontend/src/components/ui/Tabs.tsx` — Tab switcher for Scheduled / Sent.
- `frontend/src/components/ui/Badge.tsx` — Status pill (scheduled, sent, failed, etc.).
- `frontend/src/components/ui/Avatar.tsx` — User avatar with initials fallback.
- `frontend/src/components/ui/Spinner.tsx` — Loading spinner + skeleton-row helper.
- `frontend/src/components/ui/EmptyState.tsx` — Empty-state illustration/text/action block.
- `frontend/src/components/ui/Toaster.tsx` — Thin wrapper configuring the toast library with design tokens.
- `frontend/src/components/ui/index.ts` — Barrel export of all ui components.
- `frontend/src/components/layout/Header.tsx` — Top header: brand, user name/email/avatar, logout action.
- `frontend/src/components/layout/DashboardLayout.tsx` — Page shell for authenticated screens (header + content container).

**Exit criteria:** a temporary kitchen-sink route renders every ui component matching Figma tokens; no feature logic yet.

---

## Phase 8 — Frontend Features  (22 files)
**Goal:** every screen in the Figma, wired to the backend.
**Tasks**
1. Auth: LoginPage, AuthProvider, ProtectedRoute, header user info + logout.
2. Dashboard: tabs, Compose button, Slack connect, search bar.
3. Compose: form + zod, CSV parse with detected-count, submit, toasts.
4. Scheduled & Sent tables with loading/empty/error and polling.

**Files**
- `frontend/src/api/auth.api.ts` — getMe(), logout(), loginUrl() — typed.
- `frontend/src/api/emails.api.ts` — scheduleEmails(), listScheduled(), listSent(), searchEmails() — typed request/response.
- `frontend/src/api/slack.api.ts` — getSlackStatus(), connectUrl(), disconnectSlack() — typed.
- `frontend/src/lib/csv.ts` — Parse CSV/TXT of leads with papaparse, extract + dedupe + validate emails, return {emails, invalidCount}.
- `frontend/src/components/layout/ProtectedRoute.tsx` — Redirects to /login when unauthenticated; shows spinner while auth loads.
- `frontend/src/features/auth/AuthProvider.tsx` — Context providing current user + loading state via React Query `getMe`.
- `frontend/src/features/auth/useAuth.ts` — Hook exposing user, isLoading, logout().
- `frontend/src/features/auth/LoginPage.tsx` — Login screen per Figma with 'Continue with Google' -> backend OAuth start URL.
- `frontend/src/features/dashboard/DashboardPage.tsx` — Main screen: tabs (Scheduled/Sent), Compose New Email button, Connect Slack, search bar.
- `frontend/src/features/emails/ScheduledEmailsTable.tsx` — Scheduled table: Email, Subject, Scheduled time, Status; loading + empty + error states.
- `frontend/src/features/emails/SentEmailsTable.tsx` — Sent table: Email, Subject, Sent time, Status(sent/failed); loading + empty + error states.
- `frontend/src/features/emails/EmailStatusBadge.tsx` — Maps EmailStatus -> Badge variant/label.
- `frontend/src/features/emails/useScheduledEmails.ts` — React Query hook for scheduled list (auto refetch interval).
- `frontend/src/features/emails/useSentEmails.ts` — React Query hook for sent list (auto refetch interval).
- `frontend/src/features/compose/ComposeEmailModal.tsx` — Compose modal/page per Figma; hosts ComposeForm.
- `frontend/src/features/compose/ComposeForm.tsx` — Form: subject, body, leads upload (+count), start time, delay, hourly limit; validates with zod; submits.
- `frontend/src/features/compose/LeadsUploader.tsx` — Wraps FileDropzone + csv parser; shows detected email count + invalid rows.
- `frontend/src/features/compose/compose.schema.ts` — Zod schema + inferred type for the compose form.
- `frontend/src/features/compose/useScheduleEmails.ts` — React Query mutation: POST schedule, invalidate lists, toast success/error.
- `frontend/src/features/slack/ConnectSlackButton.tsx` — Shows Connect / Connected(disconnect) state; starts backend Slack OAuth.
- `frontend/src/features/slack/useSlackStatus.ts` — React Query hooks for Slack status + disconnect mutation.
- `frontend/src/features/search/EmailSearchBar.tsx` — Debounced search input hitting /api/search/emails; feeds tables.

**Exit criteria:** full happy path in browser: login → compose → schedule → see Scheduled → watch move to Sent; matches Figma closely.

---

## Phase 9 — Hardening, Load Test, Docs & Submission  (9 files)
**Goal:** prove it, document it, ship it.
**Tasks**
1. Unit + integration tests (idempotency, rate limit, restart persistence).
2. `load-test.ts`: 1000+ emails at the same time; capture behaviour for README/demo.
3. README (run steps, Ethereal + env setup, architecture, rate limiting, features mapped), assumptions/trade-offs.
4. Record ≤5 min demo (schedule → dashboard → **restart scenario** → rate-limit + Slack → optional load).
5. Private repo, grant `Mitrajit` and `Yadav036`, submit ClickUp form.

**Files**
- `README.md` — Final submission README: run backend/frontend, Ethereal + env setup, architecture (scheduling, restart persistence, rate limiting, concurrency), feature list, assumptions/trade-offs.
- `docs/assumptions-and-tradeoffs.md` — Every assumption, shortcut and trade-off made (required by the assignment). Append to it during development.
- `docs/demo-script.md` — Step-by-step script for the <=5 min demo video: schedule, dashboard, restart scenario, rate-limit + Slack message, load behaviour.
- `backend/vitest.config.ts` — Vitest config for unit + integration tests (node environment, test env vars).
- `backend/scripts/load-test.ts` — CLI: schedules 1000+ emails at the same instant to prove rate-limit + ordering + no-drop behaviour.
- `backend/tests/unit/schedule.calculator.test.ts` — Unit tests: spacing, round-robin, start time in past/future, 1000+ leads.
- `backend/tests/unit/rateLimiter.test.ts` — Unit tests: window boundaries, atomicity under concurrent calls, next-window calculation.
- `backend/tests/unit/email.processor.test.ts` — Unit tests: idempotency (double delivery of same job sends once), failure paths, reschedule path.
- `backend/tests/integration/restart-persistence.test.ts` — Integration: schedule -> kill worker -> restart -> job still sent once at correct time.

**Exit criteria:** fresh clone runs from README alone; all tests green; demo recorded; form submitted.

---

## Phase gate checklist (copy into `memory.md` per phase)

- [ ] All files of the phase implemented, headers still accurate
- [ ] Lint + type-check + tests pass
- [ ] Exit criteria demonstrated
- [ ] `memory.md` updated
- [ ] Assumptions appended to `docs/assumptions-and-tradeoffs.md`
