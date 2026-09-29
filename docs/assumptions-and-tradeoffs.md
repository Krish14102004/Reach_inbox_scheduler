<!--
  FILE: docs/assumptions-and-tradeoffs.md
  PHASE: 9 - Hardening, Load Test, Docs & Submission
  PURPOSE: Every assumption, shortcut and trade-off made (required by the assignment). Append to it during development.
-->

## Database

- MySQL instead of PostgreSQL.
- Prisma ORM v7's self-hosted MySQL setup uses `@prisma/adapter-mariadb` and constructs `PrismaClient` with a `PrismaMariaDb` adapter. The project currently declares no Prisma version or dependencies, so wire this adapter when selecting/installing Prisma 7+; Prisma's current MySQL docs also put the connection URL in `prisma.config.ts`.
- Local `prisma migrate dev` uses the Docker root account for shadow database creation; otherwise grant the migration user `CREATE` on `prisma_migrate_shadow_db%`.
