# Rules — What to Use, What to Avoid, and Boundaries for AI

> Read this before writing any code. If a rule blocks you, stop and ask — don't work around it.

---

## 1. Use (approved stack & libraries)

### Backend
| Purpose | Use |
|---|---|
| Runtime / language | Node 20+ LTS, TypeScript strict |
| HTTP | `express`, `helmet`, `cors` (credentials, explicit origin), `cookie-parser` |
| Validation / env | `zod` |
| Queue | `bullmq`, `ioredis`, `@bull-board/api` + `@bull-board/express` |
| DB | `prisma` + `@prisma/client` (MySQL) |
| Mail | `nodemailer` (Ethereal accounts via `createTestAccount`) |
| Auth | `google-auth-library`, `jsonwebtoken` |
| Slack | Plain `fetch` to Slack OAuth v2 + `chat.postMessage` (or `@slack/web-api` if it saves time) |
| Search | `@elastic/elasticsearch` |
| Logging | `pino`, `pino-http` |
| Tests | `vitest`, `supertest` |

### Frontend
| Purpose | Use |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS with design tokens (`design.md`) |
| Server state | `@tanstack/react-query` |
| Routing | `react-router-dom` |
| Forms | controlled components + `zod` (no heavy form lib unless needed) |
| CSV | `papaparse` |
| Toasts | `sonner` |
| Icons | `lucide-react` |
| Class merging | `clsx` + `tailwind-merge` |

## 2. Avoid (hard bans)

| ❌ Avoid | Why |
|---|---|
| `node-cron`, `agenda`, `cron`, `node-schedule`, `crontab`, OS cron, Vercel/GitHub cron | **Assignment hard constraint** — instant rejection |
| `setInterval`/`setTimeout` loops as a scheduler or poller for sending | Same spirit as no-cron; also breaks on restart |
| In-memory counters/locks for rate limits, delays or dedupe | Must be safe across workers → Redis/DB only |
| `any`, `@ts-ignore`, `as unknown as X` to silence types | Strict typing is graded |
| Mocked/fake auth, fake Slack call, `console.log("slack sent")` | Assignment requires **real** Google OAuth and **real** Slack message |
| Storing tokens in `localStorage`/`sessionStorage` | XSS risk → httpOnly cookie only |
| Hard-coded limits, delays, concurrency, URLs, secrets | All config via validated env |
| `process.env` access outside `config/env.ts` | Single typed source |
| Business logic in routes/controllers | Controllers are thin; logic in services |
| Direct `fetch` inside React components | Use `src/api/*` + hooks |
| Copy-pasting code from other candidates' repos or unattributed gists | Plagiarism = rejection |
| Adding heavy UI kits (MUI, Ant, Chakra) | Figma fidelity + reusable own components are graded |
| Dropping/failing a job because a limit was hit | Must reschedule |
| Committing `.env`, tokens, Ethereal creds, `node_modules` | Security |
| Redux/Zustand/MobX without a demonstrated need | Over-engineering |

## 3. Coding conventions

- **Files:** `camelCase.ts` for modules, `PascalCase.tsx` for React components, `*.test.ts` for tests. One responsibility per file.
- **Header comment:** every file keeps its `FILE / PHASE / PURPOSE` header. Update it if the purpose changes.
- **Layering (backend):** `routes → controller → service → repository`. Only repositories touch Prisma. Only `queue/*` touches BullMQ. Only `rate-limit/*` touches limit keys.
- **Pure logic first:** scheduling math and window math are pure functions with unit tests.
- **DRY:** third repetition → extract. UI primitives live in `components/ui`.
- **Types:** DTOs/exported types for every API payload on both sides; keep frontend `types/` aligned with backend `emails.types.ts`.
- **Naming:** statuses are lowercase string unions: `scheduled | processing | sent | failed`.
- **Comments:** explain *why*, not *what*. Every non-obvious concurrency decision gets a comment.
- **Commits:** small, conventional (`feat(queue): …`), one phase per branch/PR-sized chunk.

## 4. Error handling

### Backend
- Throw `AppError` subclasses (`BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`) — never bare strings.
- Validate all input with zod at the edge (`validate` middleware); return `400` + field details.
- All async handlers wrapped in `asyncHandler`; **one** central `errorHandler` produces the envelope
  `{ "error": { "code", "message", "details?" } }`. No stack traces in production responses.
- Log errors once, at the boundary, with context (`userId`, `emailId`, `jobId`).
- **Worker errors:** classify — *retryable* (SMTP timeout, 4xx transient) → throw and let BullMQ retry with exponential backoff; *rate-limited* → `DelayedError` reschedule (not a failure); *permanent* (invalid recipient) → mark `failed` with `lastError`, do not retry.
- **Side services are non-critical:** Elasticsearch and Slack failures are caught + logged and must **never** block or fail an email send.
- Graceful shutdown: stop accepting work, let in-flight jobs finish (`worker.close()`), then close Redis/Prisma.
- Never swallow errors silently; an empty `catch {}` is a bug.

### Frontend
- All requests go through `api/client.ts`, which throws a typed `ApiError`.
- Every data view handles **loading, empty, error, success**.
- Mutations: toast on success and failure; keep the form values on failure.
- Unauthenticated (`401`) → clear user state and redirect to `/login`.
- Add an error boundary at the app root; never show raw error objects to users.

## 5. Security rules

- Session = signed JWT in `httpOnly`, `sameSite=lax`, `secure` (prod) cookie.
- OAuth `state` parameter required and verified for both Google and Slack.
- Every query is scoped by `userId`; never trust ids from the client alone.
- Rate-limit auth endpoints; set body size limits; use `helmet`.
- Bull Board is behind `requireAuth`.
- Secrets only from env; `.env.example` contains names, never values.

## 6. Testing rules

- Unit tests: `schedule.calculator`, `time` window math, `rateLimiter`, `email.processor` idempotency.
- Integration test: restart persistence (schedule → stop worker → start → sent once).
- A bug fix starts with a failing test when practical.
- Don't mock Redis for rate-limit tests; use a real Redis (Docker) so atomicity is actually tested.

## 7. Boundaries for AI assistants (Claude / Copilot / etc.)

**The AI MAY:**
- Read `PRD.md`, `architecture.md`, `phases.md`, `rules.md`, `design.md`, `memory.md` at the start of every session.
- Implement only the files belonging to the **current phase** (see `phases.md` and the `PHASE:` header of each file).
- Fill in stub files while preserving their header comments.
- Propose improvements to docs (as a suggested diff/note in `memory.md`), and add tests.

**The AI MUST:**
- Update `memory.md` after every meaningful chunk of work (completed items, current file, next step, blockers).
- Keep all config env-driven and typed; keep strict TypeScript.
- Follow the layering and error-handling rules above.
- State assumptions explicitly and append them to `docs/assumptions-and-tradeoffs.md`.
- Ask the user when a requirement, Figma detail, or credential is missing instead of guessing.
- Run lint + type-check + relevant tests before declaring a phase done.

**The AI MUST NOT:**
- Introduce cron/scheduler libraries or polling schedulers — ever.
- Add a dependency that isn't in §1 without asking (name it, justify it, get a yes).
- Invent Figma values (colors, spacing, copy). Use `design.md` tokens; if a token is `TBD`, ask.
- Fake integrations (mock Google login, log-only Slack). Real flows only.
- Rewrite, rename or delete files outside the current phase, or reformat unrelated code.
- Skip ahead of the phase order to "save time" unless the user approves.
- Commit or print secrets, tokens, or `.env` contents.
- Weaken a rule to make a test pass (e.g., remove idempotency guard, disable a limit).
- Claim something works without having run it; say "not verified" instead.
- Copy code from external repos/tutorials verbatim (plagiarism check applies).

**When unsure → stop and ask.** A short question is cheaper than a rewrite inside a 48-hour deadline.
