# PRD — ReachInbox Full-Stack Email Job Scheduler

> Source of truth for **what** we are building and **why**. Derived from the "Software Development Intern Assignment" (Notion) and the Outbox Labs Figma.
> How it is built → `architecture.md`. Order of work → `phases.md`.

---

## 1. Overview

A production-grade **email scheduler service + dashboard**, a tiny slice of what ReachInbox does under the hood (reliable scheduling and sending of cold emails at scale).

A user signs in with Google, uploads a list of leads, writes an email, and schedules it. The backend persists every email, schedules it with **BullMQ delayed jobs on Redis (no cron)**, and sends it through **Ethereal Email (fake SMTP)** from multiple senders — while respecting **concurrency, per-email delay, and hourly rate limits**. When a sender hits its hourly limit, the user gets a **real Slack message**. The dashboard shows what is scheduled and what has been sent.

## 2. Goals

1. **Reliability:** scheduled emails survive server/worker restarts and are sent at the right time.
2. **Exactly-once behaviour:** the same email is never sent twice (idempotency).
3. **Throughput control:** configurable worker concurrency, minimum delay between sends, hourly limit that is safe across multiple workers.
4. **Never drop work:** when limits are hit, jobs are re-scheduled to the next window — not failed, not lost.
5. **Visibility:** dashboard for users; live BullMQ dashboard for operators; searchable emails via Elasticsearch.
6. **Code quality:** structured real-world backend, clean typed React frontend matching Figma.

## 3. Non-goals (out of scope)

- Real email delivery to real inboxes (Ethereal only).
- Email open/click tracking, bounce handling, unsubscribe flows.
- Multi-tenant billing, roles/permissions beyond "a user sees only their own data".
- Email template editor / rich-text WYSIWYG (plain subject + body is enough unless Figma shows otherwise).
- Mobile-native apps.

## 4. Target users

| Persona                               | Description                                       | What they need                                                                                           |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Outreach operator** (primary)       | Sales/growth person running cold email campaigns. | Upload leads, schedule a campaign, see what is queued/sent, be alerted when limits are hit.              |
| **Platform/dev operator** (secondary) | Engineer watching the system.                     | Live queue visibility (Bull Board), predictable behaviour on restart and under load.                     |
| **Assignment reviewers** (evaluators) | ReachInbox engineers.                             | Correct persistence, idempotency, rate-limit design, clean code, honest README/trade-offs, a clear demo. |

## 5. User stories

- As an operator I can **log in with Google** and see my name, email and avatar in the header, and log out.
- As an operator I can **compose an email** (subject, body), **upload a CSV/TXT of leads** and immediately see **how many addresses were detected**.
- As an operator I can set **start time**, **delay between emails**, and **hourly limit**, then click **Schedule**.
- As an operator I can view **Scheduled Emails** (email, subject, scheduled time, status) and **Sent Emails** (email, subject, sent time, sent/failed), each with loading and empty states.
- As an operator I can **search** my scheduled/sent emails.
- As an operator I can **Connect Slack** and receive a **live Slack message** when a sender's hourly limit is reached; if I never connect, nothing breaks; if I connect later, alerts start working without redeploy.
- As a dev operator I can open **`/admin/queues`** and see jobs move in real time.
- As a dev operator I can **stop and restart** the server/worker and see future emails still send once, on time.

## 6. Functional requirements

Priority: **M** = must (assignment-mandated), **S** = should, **C** = could (bonus).

### 6.1 Backend

| ID   | Requirement                                                                                                                              | Pri |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | --- |
| B-1  | Accept email scheduling requests via REST API.                                                                                           | M   |
| B-2  | Persist scheduled emails in MySQL.                                                                                                       | M   |
| B-3  | Schedule with **BullMQ delayed jobs** on Redis. **No cron** of any kind.                                                                 | M   |
| B-4  | Send via **Ethereal SMTP** from **multiple senders**.                                                                                    | M   |
| B-5  | **Persistence on restart:** future emails still send on time; no duplicates; no restart from scratch.                                    | M   |
| B-6  | **Idempotency:** same email is never sent more than once (DB unique key + atomic claim + deterministic jobId).                           | M   |
| B-7  | **Configurable worker concurrency**, safe under parallel execution.                                                                      | M   |
| B-8  | **Minimum delay between individual sends** (documented in README).                                                                       | M   |
| B-9  | **Hourly rate limit** (global or per sender), configurable via env, Redis/DB backed, safe across workers/instances.                      | M   |
| B-10 | On limit hit: **delay to next hour window**, never drop/fail, preserve order as much as possible.                                        | M   |
| B-11 | **Slack OAuth** connect flow per user; **real Slack message** on rate-limit hit; graceful when not connected; works after later connect. | M   |
| B-12 | **Elasticsearch** indexing so scheduled/sent emails are searchable.                                                                      | M   |
| B-13 | **Live BullMQ dashboard** (Bull Board).                                                                                                  | M   |
| B-14 | Defined behaviour for **1000+ emails** scheduled for the same time.                                                                      | M   |
| B-15 | Google OAuth session handling (login, me, logout).                                                                                       | M   |
| B-16 | Load-test script demonstrating B-14.                                                                                                     | S   |

### 6.2 Frontend (must match Figma as closely as possible)

| ID  | Requirement                                                                                                                                | Pri |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| F-1 | **Real Google OAuth** login → redirect to dashboard.                                                                                       | M   |
| F-2 | Header shows user **name, email, avatar** + **Logout**.                                                                                    | M   |
| F-3 | Dashboard with **Scheduled Emails** and **Sent Emails** tabs + **Compose New Email** button.                                               | M   |
| F-4 | Compose: subject, body, **CSV/TXT upload with detected-email count**, start time, delay between emails, hourly limit, **Schedule** button. | M   |
| F-5 | Scheduled table: Email, Subject, Scheduled time, Status — with **loading** and **empty** states.                                           | M   |
| F-6 | Sent table: Email, Subject, Sent time, Status (`sent`/`failed`) — with **loading** and **empty** states.                                   | M   |
| F-7 | **Connect Slack** button + connected state.                                                                                                | M   |
| F-8 | Reusable UI components, DRY, typed API layer, toasts/error handling.                                                                       | M   |
| F-9 | Email search bar (uses Elasticsearch endpoint).                                                                                            | S   |

## 7. Non-functional requirements

- **Correctness over speed:** never lose or duplicate an email.
- **Configurability:** no hard-coded limits/delays/concurrency — all env-driven with validated defaults.
- **Scalability:** behaviour must hold with multiple worker instances (no in-memory-only state).
- **Security:** httpOnly session cookie, CSRF-safe OAuth `state`, secrets only via env, users can only read their own data, Bull Board behind auth.
- **Observability:** structured logs with job/email ids; Bull Board.
- **Testability:** pure functions for scheduling math and window math; integration test for restart persistence.

## 8. Constraints (non-negotiable)

- ❌ No cron: no `crontab`, no `node-cron`, no `agenda`, no `setInterval` polling loops used as a scheduler.
- ✅ Stack: TypeScript, Express, BullMQ + Redis, MySQL, Ethereal, React/Next + Tailwind.
- ✅ Original work — plagiarism = rejection.
- ⏱ 48-hour window.

## 9. Acceptance criteria (definition of "done" for the product)

1. Schedule 20 emails 1 minute apart → they appear in **Scheduled**, then move to **Sent** at the right times.
2. Kill API + worker mid-run, restart → remaining emails still send once, on time; no duplicates in Ethereal inbox or DB.
3. Set hourly limit = 5, schedule 12 → 5 send now, the rest are re-scheduled into following hour windows in order; none fail; Slack message arrives once per sender per window.
4. Slack never connected → limit hit → no crash, no message. Connect Slack → next limit hit → message arrives (no redeploy).
5. Worker concurrency changed via env only → observable change in parallelism.
6. Emails searchable through the search endpoint/UI; `/admin/queues` shows live jobs.
7. UI visually matches Figma; loading/empty/error states present.
8. README + demo video (≤5 min) + trade-offs note + private repo shared with `Mitrajit` and `Yadav036` + ClickUp form submitted.

## 10. Deliverables checklist

- [ ] Private GitHub repo (access: `Mitrajit`, `Yadav036`)
- [ ] README (run instructions, Ethereal + env setup, architecture, features mapped to backend/frontend)
- [ ] Demo video ≤ 5 min (schedule, dashboard, restart scenario, bonus: rate-limit under load)
- [ ] Assumptions / shortcuts / trade-offs note
- [ ] ClickUp submission form

## 11. Assumptions & open questions

- **Figma was not readable when this scaffold was created** (tool returned "no edit access"). UI details in `design.md` are placeholders until the frames are inspected. Frontend screens listed here come from the Notion brief only.
- Hourly limit from the compose form is treated as the **per-sender hourly limit for that batch**, capped by an env-configured maximum (`MAX_EMAILS_PER_HOUR_PER_SENDER`). Confirm against Figma.
- "Multiple senders" = several Ethereal accounts per user, assigned round-robin.
- Email body is plain text/simple HTML unless Figma shows a rich editor.
- Elasticsearch appears in the backend section of the brief but not in the tech list; treated as **required**.
