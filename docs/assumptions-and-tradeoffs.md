<!--
  FILE: docs/assumptions-and-tradeoffs.md
  PHASE: 9 - Hardening, Load Test, Docs & Submission
  PURPOSE: Every assumption, shortcut and trade-off made (required by the assignment). Append to it during development.
-->

## Database

- MySQL instead of PostgreSQL.
- Prisma CLI and client are pinned to the Prisma 6 line (resolved locally as 6.19.3); this project intentionally uses the Prisma 6 datasource URL in `schema.prisma` rather than Prisma 7 adapter configuration.
- The local Docker MySQL root account is used for migrations. Production deployments should use a restricted database account and `prisma migrate deploy`.

## Delivery and Rate Limits

- Ethereal SMTP is used for test capture; emails are not sent to real recipients.
- The hourly limit is per sender and shared across batches within a UTC hour. A sender that already used its allowance can cause a new batch to move immediately to the next window.
- `ETHEREAL_ALLOW_SELF_SIGNED_CERTS` is an opt-in development-only workaround for local TLS interception. Production always verifies certificates.
- A job is claimed atomically in MySQL. Scheduled rows are restored on API startup, while stale processing claims are reset after the configured timeout.

## UI and Integrations

- UI values are approximated from seven user-provided screenshots; the original Figma file was not accessible for exact measurements.
- Google OAuth is verified locally with the callback on port 4001. Slack OAuth and alert delivery require a configured Slack app and still need a live delivery check.
- Elasticsearch failures are best-effort for sending; use the reindex CLI to repair missing search documents.
