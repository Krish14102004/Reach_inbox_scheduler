# Architecture — ReachInbox Email Job Scheduler

> App flow, system design, tech stack, and folder/file structure.
> Product intent → `PRD.md` · Build order → `phases.md` · Conventions → `rules.md` · Visuals → `design.md`

---

## 1. System overview

```
┌────────────────────┐        HTTPS (cookie session)        ┌──────────────────────────┐
│  React SPA (Vite)  │ ───────────────────────────────────▶ │   API process (Express)  │
│  Tailwind, RQ      │ ◀─────────────────────────────────── │   auth · emails · slack  │
└────────────────────┘                                      │   search · bull-board    │
                                                            └───────┬───────────┬──────┘
                                                                    │           │
                                              enqueue delayed jobs  │           │ read/write
                                                                    ▼           ▼
                                                            ┌────────────┐  ┌──────────────┐
                                                            │   Redis    │  │ MySQL 8      │
                                                            │ BullMQ +   │  │ users,       │
                                                            │ counters + │  │ senders,     │
                                                            │ gates      │  │ emails, slack│
                                                            └─────┬──────┘  └──────▲───────┘
                                                                  │ jobs            │
                                                                  ▼                 │
                                                        ┌───────────────────────┐   │
                                                        │ Worker process(es)    │───┘
                                                        │ BullMQ Worker         │
                                                        │ concurrency=N         │──▶ Ethereal SMTP
                                                        │ rate limit + gate     │──▶ Slack API (on limit hit)
                                                        └──────────┬────────────┘──▶ Elasticsearch (index/update)
                                                                   
```

Two Node processes from one codebase:

- **API** (`src/server.ts`): HTTP, auth, scheduling endpoints, Bull Board, search.
- **Worker** (`src/worker.ts`): consumes the queue and sends mail. Can be run N times; all shared state lives in Redis/MySQL, never in memory.

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Required; types across the whole stack |
| API | Express.js | Required |
| Queue | BullMQ on Redis (AOF on) | Required; delayed jobs, persistence, limiter, Bull Board |
| DB | MySQL 8 + Prisma | Relational source of truth; migrations; typed queries |
| SMTP | Ethereal via Nodemailer | Required fake SMTP; per-sender accounts |
| Search | Elasticsearch 8 | Required searchable emails |
| Auth | Google OAuth 2.0 (`google-auth-library`) + JWT in httpOnly cookie | Real OAuth, no sessions store needed |
| Slack | Slack OAuth v2 + `chat.postMessage` (or incoming webhook from OAuth) | Real, verifiable message |
| Validation | Zod | One schema language for env, requests, forms |
| Logging | Pino | Structured, fast |
| Tests | Vitest | Unit + integration |
| Frontend | React 18 + Vite + TypeScript | Fast DX; "React" chosen over Next (no SSR need) |
| Styling | Tailwind CSS v4 + tokens from Figma | Required (or similar) |
| Data fetching | TanStack Query | Loading/error/refetch states for free |
| Routing | React Router | Simple protected routes |
| Toasts | sonner | Minimal error/success messaging |
| CSV | papaparse | Robust CSV parsing |
| Infra | Docker Compose | MySQL, Redis, Elasticsearch |

## 3. Core flows

### 3.1 Login (Google OAuth)
1. SPA → `GET /api/auth/google` → server redirects to Google with signed `state`.
2. Google → `GET /api/auth/google/callback?code&state` → verify state, exchange code, verify ID token.
3. Upsert `User`, issue **JWT in httpOnly cookie**, redirect to `FRONTEND_URL/`.
4. SPA calls `GET /api/auth/me` to render header (name, email, avatar). Logout clears cookie.

### 3.2 Schedule emails
1. Compose form → `POST /api/emails/schedule` `{subject, body, leads[], startTime, delayBetweenMs, hourlyLimit}`.
2. Zod-validate. `schedule.calculator` (pure) computes `scheduledAt_i = startTime + i × delay` and assigns senders round-robin.
3. **One DB transaction**: create `EmailBatch` + N `ScheduledEmail` rows (`status=scheduled`, unique `idempotencyKey`). Generate each email ID app-side before insert, then use `createMany({ skipDuplicates: true })`; MySQL does not support Prisma's `createManyAndReturn`.
4. `addBulk` to BullMQ: `delay = scheduledAt − now`, **`jobId = emailId`** (re-adding the same id is a no-op → idempotent enqueue).
5. Index into Elasticsearch (best effort, non-blocking).
6. Return `202` with batch summary.

### 3.3 Send (worker)
```
job(emailId)
 ├─ claim: UPDATE … SET status='processing' WHERE id=? AND status='scheduled'  → 0 rows? ⇒ already handled, exit OK
 ├─ rate-limit check (Redis Lua, key rl:{sender}:{hourWindow}) → over? ⇒ reschedule to next window (P4), release claim
 ├─ send-gate check (Redis SET NX PX min-delay, key gate:{sender})      → busy? ⇒ re-delay by remaining ms, release claim
 ├─ SMTP send via Ethereal
 ├─ UPDATE status='sent', sentAt, messageId  (or 'failed' after retries exhausted)
 └─ update Elasticsearch doc
```

### 3.4 Restart safety (no cron)
- Jobs live in **Redis (AOF)**; truth lives in **MySQL**. Restarting API/worker loses nothing.
- **Reconciler** (`queue/reconciler.ts`) runs **once at boot** (not periodic): finds `scheduled` rows with no BullMQ job → re-adds by same `jobId`; resets stale `processing` rows (crash mid-send) back to `scheduled`.
- BullMQ **stalled-job** detection re-queues jobs whose worker died; the atomic claim + unique key prevent double sending.

### 3.5 Rate limit hit
1. Limiter returns `{allowed:false, nextWindowStart}`.
2. Processor calls `rescheduler`: `job.moveToDelayed(nextWindowStart + rankOffset)` and throws `DelayedError` (job is **not** failed, attempts not consumed). DB `scheduledAt` is updated so the UI shows the new time.
3. `slack.notifier` posts once per `(sender, window)` (dedupe flag in Redis). Not connected → silent no-op.

### 3.6 Slack connect
`GET /api/slack/connect` → Slack authorize → `/api/slack/callback` → store token/webhook in `SlackConnection(userId)`. `DELETE /api/slack/disconnect` removes it. Notifier looks up the connection at send-time, so connecting later needs **no redeploy**.

### 3.7 Search
Indexer keeps ES in sync on schedule, on status change, and via `scripts/reindex-elasticsearch.ts`. `GET /api/search/emails?q=` queries ES filtered by `userId`.

## 4. Data model (MySQL)

| Table | Key columns |
|---|---|
| `User` | id, googleId (unique), email, name, avatarUrl, createdAt |
| `Sender` | id, userId, email, smtpHost, smtpPort, smtpUser, smtpPass (encrypted at rest if time allows), label |
| `EmailBatch` | id, userId, subject, body, startTime, delayBetweenMs, hourlyLimit, createdAt |
| `ScheduledEmail` | id, batchId, userId, senderId, toEmail, subject, body, **status** (`scheduled` \| `processing` \| `sent` \| `failed`), scheduledAt, sentAt, attempts, lastError, messageId, **idempotencyKey (UNIQUE)** = SHA-256 hex hash(batchId + toEmail + index) |
| `SlackConnection` | id, userId (unique), teamId, accessToken/webhookUrl, channelId, createdAt |

Indexes: `(status, scheduledAt)`, `(userId, status, scheduledAt)`, unique `idempotencyKey` (`VARCHAR(64)`). Email addresses use `VARCHAR(320)`, subjects `VARCHAR(998)`, and body, SMTP password, and last error use `TEXT`. `scheduledAt` and `sentAt` use `DATETIME(3)`; timestamps are UTC because MySQL `DATETIME` has no timezone. Use MySQL's default case-insensitive collation for recipient dedupe; Prisma filters must not specify `mode: 'insensitive'`.

For local migrations, use the Docker `root` account in `DATABASE_URL`; otherwise grant the migration user `CREATE` on `prisma_migrate_shadow_db%`. The atomic scheduled-to-processing claim remains an InnoDB `updateMany` guarded by `status = 'scheduled'`, with the returned count determining whether the claim succeeded.

## 5. Redis key design

| Key | Purpose | TTL |
|---|---|---|
| `bull:email-queue:*` | BullMQ internal | — |
| `rl:{senderId}:{yyyyMMddHH}` | hourly counter (atomic Lua INCR-if-below) | window end + buffer |
| `rl:rank:{senderId}:{yyyyMMddHH}` | ordering offset counter for overflow jobs | window end + buffer |
| `gate:{senderId}` | min-delay lock (`SET NX PX`) | MIN_DELAY ms |
| `slack:notified:{senderId}:{yyyyMMddHH}` | dedupe Slack alert per window | window end + buffer |

## 6. Rate limiting, concurrency and load behaviour

- **Concurrency:** `WORKER_CONCURRENCY` → BullMQ `Worker({concurrency})`. Safe because every side-effecting step is guarded by the atomic DB claim and Redis atomics.
- **Min delay between sends:** per-sender `SET gate:{sender} NX PX MIN_DELAY_MS`. If busy, job is re-delayed by `PTTL` (worker is never blocked/sleeping). A global BullMQ `limiter` is a second safety net. Chosen value documented in README.
- **Hourly limit:** per sender, `MAX_EMAILS_PER_HOUR_PER_SENDER` default, overridable per batch (capped). Lua script `if GET < limit then INCR; return 1 else return 0`. Multi-worker safe.
- **1000+ emails at the same time:** all rows/jobs created up front; workers drain at `min(concurrency, min-delay, hourly limit)`. Overflow is spread into `nextWindowStart + rank × delay` so order is preserved and no window is overloaded. Nothing is dropped; DB `scheduledAt` reflects reality.
- **Fairness:** senders are limited independently; one saturated sender doesn't block others.

## 7. API surface

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | – | liveness (DB, Redis, ES) |
| GET | `/api/auth/google` | – | start OAuth |
| GET | `/api/auth/google/callback` | – | finish OAuth |
| GET | `/api/auth/me` | ✔ | current user |
| POST | `/api/auth/logout` | ✔ | clear cookie |
| POST | `/api/emails/schedule` | ✔ | create batch + jobs |
| GET | `/api/emails/scheduled` | ✔ | paginated scheduled list |
| GET | `/api/emails/sent` | ✔ | paginated sent/failed list |
| GET | `/api/senders` / POST | ✔ | list / create Ethereal sender |
| GET | `/api/slack/connect` · `/callback` · `/status` · DELETE `/disconnect` | ✔ | Slack OAuth |
| GET | `/api/search/emails` | ✔ | ES search |
| GET | `/admin/queues` | ✔ | Bull Board |

Error envelope (all errors): `{ "error": { "code": "STRING", "message": "human text", "details": {...}? } }`.

## 8. Frontend architecture (React)

- **Feature-first folders**: `features/<name>/` owns its components, hooks, schemas. Shared UI in `components/ui`, layout in `components/layout`.
- **Server state** = TanStack Query (lists poll every ~5–10 s so Scheduled → Sent updates live). **Local UI state** = `useState`. **No global store** unless needed.
- **API layer** (`src/api/*`) is the only place that calls `fetch`; returns typed DTOs; errors normalised to `ApiError`.
- **Auth** = cookie + `GET /me`; `AuthProvider` exposes `user`; `ProtectedRoute` guards `/`.
- **Forms** = controlled components + Zod schema (`compose.schema.ts`) → inline field errors + toast on server errors.
- **Every data view** implements: loading, empty, error, success.
- Tokens from `design.md` live in `styles/theme.css`; components never hard-code colors.

## 9. Environment variables (see `backend/.env.example`)

`NODE_ENV, PORT, FRONTEND_URL, DATABASE_URL, REDIS_URL, ELASTICSEARCH_URL, JWT_SECRET, COOKIE_DOMAIN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_REDIRECT_URI, WORKER_CONCURRENCY, MIN_DELAY_BETWEEN_EMAILS_MS, MAX_EMAILS_PER_HOUR_PER_SENDER, MAX_ATTEMPTS, BULL_BOARD_ENABLED`

Frontend: `VITE_API_BASE_URL`.

## 10. Key trade-offs (expand in `docs/assumptions-and-tradeoffs.md`)

- **At-least-once send + idempotent guard** rather than true exactly-once (SMTP has no transactions). A crash *after* SMTP accept but *before* DB update can re-send once; mitigated by storing `messageId` early and the claim state machine. Documented honestly.
- **Reconciler at boot only** (not periodic) to respect the no-cron rule.
- **JWT cookie** instead of server sessions: simpler, stateless, revocation is coarser.
- **Vite SPA** instead of Next.js: no SSR need; dev proxy keeps cookies same-site.

## 11. Folder & file structure

`[P#]` = the phase in which the file is built (see `phases.md`). Every generated file starts with a header comment stating its path, phase and purpose. Total scaffold files: 127.

```
reachinbox-scheduler/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma  [P1]
│   ├── scripts/
│   │   ├── create-ethereal-senders.ts  [P3]
│   │   ├── load-test.ts  [P9]
│   │   └── reindex-elasticsearch.ts  [P6]
│   ├── src/
│   │   ├── config/
│   │   │   ├── constants.ts  [P1]
│   │   │   └── env.ts  [P1]
│   │   ├── lib/
│   │   │   ├── asyncHandler.ts  [P1]
│   │   │   ├── elasticsearch.ts  [P6]
│   │   │   ├── errors.ts  [P1]
│   │   │   ├── logger.ts  [P1]
│   │   │   ├── mailer.ts  [P3]
│   │   │   ├── prisma.ts  [P1]
│   │   │   ├── redis.ts  [P1]
│   │   │   └── time.ts  [P4]
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts  [P1]
│   │   │   ├── notFound.ts  [P1]
│   │   │   ├── requestLogger.ts  [P1]
│   │   │   ├── requireAuth.ts  [P2]
│   │   │   └── validate.ts  [P1]
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts  [P2]
│   │   │   │   ├── auth.routes.ts  [P2]
│   │   │   │   ├── auth.service.ts  [P2]
│   │   │   │   ├── google.client.ts  [P2]
│   │   │   │   └── session.ts  [P2]
│   │   │   ├── emails/
│   │   │   │   ├── emails.controller.ts  [P3]
│   │   │   │   ├── emails.repository.ts  [P3]
│   │   │   │   ├── emails.routes.ts  [P3]
│   │   │   │   ├── emails.schema.ts  [P3]
│   │   │   │   ├── emails.service.ts  [P3]
│   │   │   │   ├── emails.types.ts  [P3]
│   │   │   │   └── schedule.calculator.ts  [P3]
│   │   │   ├── search/
│   │   │   │   ├── search.controller.ts  [P6]
│   │   │   │   └── search.routes.ts  [P6]
│   │   │   ├── senders/
│   │   │   │   ├── senders.repository.ts  [P3]
│   │   │   │   ├── senders.routes.ts  [P3]
│   │   │   │   └── senders.service.ts  [P3]
│   │   │   ├── slack/
│   │   │   │   ├── slack.controller.ts  [P5]
│   │   │   │   ├── slack.notifier.ts  [P5]
│   │   │   │   ├── slack.repository.ts  [P5]
│   │   │   │   ├── slack.routes.ts  [P5]
│   │   │   │   └── slack.service.ts  [P5]
│   │   │   └── users/
│   │   │       └── users.repository.ts  [P2]
│   │   ├── queue/
│   │   │   ├── bullBoard.ts  [P6]
│   │   │   ├── email.processor.ts  [P3]
│   │   │   ├── email.queue.ts  [P3]
│   │   │   ├── email.worker.ts  [P3]
│   │   │   ├── queue.connection.ts  [P3]
│   │   │   └── reconciler.ts  [P3]
│   │   ├── rate-limit/
│   │   │   ├── rateLimiter.ts  [P4]
│   │   │   ├── rescheduler.ts  [P4]
│   │   │   └── sendGate.ts  [P4]
│   │   ├── search/
│   │   │   ├── indexer.ts  [P6]
│   │   │   └── mapping.ts  [P6]
│   │   ├── app.ts  [P1]
│   │   ├── routes.ts  [P1]
│   │   ├── server.ts  [P1]
│   │   └── worker.ts  [P3]
│   ├── tests/
│   │   ├── integration/
│   │   │   └── restart-persistence.test.ts  [P9]
│   │   └── unit/
│   │       ├── email.processor.test.ts  [P9]
│   │       ├── rateLimiter.test.ts  [P9]
│   │       └── schedule.calculator.test.ts  [P9]
│   ├── .env.example  [P0]
│   ├── eslint.config.js  [P0]
│   ├── package.json  [P0]
│   ├── tsconfig.json  [P0]
│   └── vitest.config.ts  [P9]
├── docs/
│   ├── assumptions-and-tradeoffs.md  [P9]
│   └── demo-script.md  [P9]
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── auth.api.ts  [P8]
│   │   │   ├── client.ts  [P7]
│   │   │   ├── emails.api.ts  [P8]
│   │   │   └── slack.api.ts  [P8]
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx  [P7]
│   │   │   │   ├── Header.tsx  [P7]
│   │   │   │   └── ProtectedRoute.tsx  [P8]
│   │   │   └── ui/
│   │   │       ├── Avatar.tsx  [P7]
│   │   │       ├── Badge.tsx  [P7]
│   │   │       ├── Button.tsx  [P7]
│   │   │       ├── DateTimeInput.tsx  [P7]
│   │   │       ├── EmptyState.tsx  [P7]
│   │   │       ├── FileDropzone.tsx  [P7]
│   │   │       ├── index.ts  [P7]
│   │   │       ├── Input.tsx  [P7]
│   │   │       ├── Modal.tsx  [P7]
│   │   │       ├── Spinner.tsx  [P7]
│   │   │       ├── Table.tsx  [P7]
│   │   │       ├── Tabs.tsx  [P7]
│   │   │       ├── Textarea.tsx  [P7]
│   │   │       └── Toaster.tsx  [P7]
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── AuthProvider.tsx  [P8]
│   │   │   │   ├── LoginPage.tsx  [P8]
│   │   │   │   └── useAuth.ts  [P8]
│   │   │   ├── compose/
│   │   │   │   ├── compose.schema.ts  [P8]
│   │   │   │   ├── ComposeEmailModal.tsx  [P8]
│   │   │   │   ├── ComposeForm.tsx  [P8]
│   │   │   │   ├── LeadsUploader.tsx  [P8]
│   │   │   │   └── useScheduleEmails.ts  [P8]
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx  [P8]
│   │   │   ├── emails/
│   │   │   │   ├── EmailStatusBadge.tsx  [P8]
│   │   │   │   ├── ScheduledEmailsTable.tsx  [P8]
│   │   │   │   ├── SentEmailsTable.tsx  [P8]
│   │   │   │   ├── useScheduledEmails.ts  [P8]
│   │   │   │   └── useSentEmails.ts  [P8]
│   │   │   ├── search/
│   │   │   │   └── EmailSearchBar.tsx  [P8]
│   │   │   └── slack/
│   │   │       ├── ConnectSlackButton.tsx  [P8]
│   │   │       └── useSlackStatus.ts  [P8]
│   │   ├── lib/
│   │   │   ├── cn.ts  [P7]
│   │   │   ├── csv.ts  [P8]
│   │   │   └── formatters.ts  [P7]
│   │   ├── routes/
│   │   │   └── AppRoutes.tsx  [P7]
│   │   ├── styles/
│   │   │   ├── index.css  [P7]
│   │   │   └── theme.css  [P7]
│   │   ├── types/
│   │   │   ├── api.types.ts  [P7]
│   │   │   ├── email.types.ts  [P7]
│   │   │   └── user.types.ts  [P7]
│   │   ├── App.tsx  [P7]
│   │   └── main.tsx  [P7]
│   ├── .env.example  [P0]
│   ├── eslint.config.js  [P0]
│   ├── index.html  [P0]
│   ├── package.json  [P0]
│   ├── tsconfig.json  [P0]
│   └── vite.config.ts  [P0]
├── .gitignore  [P0]
├── architecture.md  [root doc]
├── design.md  [root doc]
├── docker-compose.yml  [P0]
├── memory.md  [root doc]
├── package.json  [P0]
├── phases.md  [root doc]
├── PRD.md  [root doc]
├── README.md  [P9]
└── rules.md  [root doc]
```
