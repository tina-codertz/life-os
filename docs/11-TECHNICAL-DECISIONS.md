# 11 — Technical Decisions (ADR Log)

| | |
|---|---|
| **Purpose** | Records *why* decisions were made, with alternatives and trade-offs |
| **Status** | Living document |
| **Last updated** | 2026-11-03 |

**Status values:** `Confirmed` (agreed by the project owner) · `Proposed` (recommended, awaiting review) · `Superseded`.

## ADR template
```md
### ADR-NNN — Title
- **Status:** Proposed | Confirmed | Superseded by ADR-XXX
- **Date:** YYYY-MM-DD
- **Context:** What problem forces a decision?
- **Decision:** What we chose.
- **Alternatives:** What else was considered and why not.
- **Consequences:** Trade-offs, follow-ups, risks.
```

---

## Index

| ADR | Title | Status |
|---|---|---|
| 001 | Modular monolith backend | Confirmed |
| 002 | Bun workspaces as package manager; Node runtime | **Confirmed** |
| 003 | PostgreSQL + Prisma | Confirmed (brief stack) |
| 004 | JWT access + rotating opaque refresh tokens | Confirmed |
| 005 | Money as integer minor units (BigInt) | Confirmed |
| 006 | UTC instants + local-date columns for day logic | Confirmed |
| 007 | Violet/indigo primary accent; green reserved for success | **Confirmed** |
| 008 | Self-hosted single VPS with Docker Compose + Caddy | **Confirmed** |
| 009 | Zod schemas shared between mobile and API | Confirmed |
| 010 | Online-first with persisted query cache (no offline sync in MVP) | Confirmed |
| 011 | MVP scope excludes Finance, Gamification, AI | Confirmed |
| 012 | Zod→OpenAPI tooling choice | Open (decide in Phase 4) |
| 013 | UUIDv7 primary keys | Confirmed |
| 014 | Habit reminders as local notifications in MVP | Confirmed |
| 015 | Email verification not required to start using the app | **Confirmed** |
| 016 | Commit directly to `main`; no branch protection or PRs for now | **Confirmed** |
| 017 | API uses NestJS 12 defaults: ESM, Vitest, oxlint; `shared` has no build step | Proposed |

---

### ADR-001 — Modular monolith backend
- **Status:** Confirmed · 2026-11-04
- **Context:** One developer, ~10 domain areas, one database, low initial traffic. Several workflows span modules in one transaction (task completion → XP).
- **Decision:** A single NestJS app with feature modules, public-service boundaries, no cyclic deps, and domain events for cross-module side effects.
- **Alternatives:** Microservices are rejected: ops cost (multiple deploys, network failures, distributed transactions) with no benefit at this scale. A layered "big ball" monolith is rejected because it erodes boundaries.
- **Consequences:** Modules could be extracted later if needed. Boundaries must be policed in code review. (Proposed: an ESLint `import/no-restricted-paths` rule.)

### ADR-002 — Bun workspaces as package manager; Node runtime
- **Status:** Confirmed · 2026-11-03
- **Context:** The brief lists Bun as a learning goal. Bun is a runtime *and* package manager. Git remains version control.
- **Decision:** Use `bun install` and Bun workspaces for the monorepo. Run NestJS and Expo/Metro on **Node LTS**. Use `bun run` for scripts.
- **Alternatives:** pnpm (most battle-tested Expo monorepo setup); Bun as the API runtime too (faster, but NestJS decorators/reflect-metadata and Prisma engines are less proven there).
- **Consequences:** Must verify Expo's monorepo support with Bun's `node_modules` layout in Phase 3 (fallback: `nodeLinker`/hoisting config, or switch to pnpm with low migration cost, since only lockfile/scripts change). The Docker image for the API uses Node.

### ADR-003 — PostgreSQL + Prisma
- **Status:** Confirmed · 2026-11-03
- **Context:** Relational data with strong integrity needs (ownership, uniqueness, money).
- **Decision:** PostgreSQL 18 with Prisma ORM and Prisma Migrate. Raw SQL migrations for CHECK constraints and partial indexes.
- **Alternatives:** Drizzle (closer to SQL, good for learning SQL) or TypeORM (decorator-heavy, weaker types).
- **Consequences:** Prisma hides SQL, so the learning plan includes writing the equivalent SQL by hand and reading `EXPLAIN` output.
- **Version (2026-11-06):** **Prisma 7.10.1, pinned exactly.** npm's `latest` tag points at Prisma 8 *release candidates* (new "contract" API, little documentation). We stay on stable 7.x and revisit once 8.0 is final. Prisma 7 specifics: the `pg` driver adapter (`@prisma/adapter-pg`); the generated client lives in `apps/api/src/generated/prisma` (git-ignored, rebuilt by `postinstall`); `migrate dev` no longer runs `generate`, so run `bun run prisma:generate` after schema changes; the DB URL lives in `prisma.config.ts`, not in the schema.

### ADR-004 — JWT access + rotating opaque refresh tokens
- **Status:** Confirmed · 2026-11-04
- **Decision:** 15-min HS256 access JWT held in memory. 30-day opaque refresh token stored hashed in `Session` and in SecureStore on device, rotated on each use with family-wide revocation on reuse.
- **Alternatives:** Long-lived JWT (can't revoke); server sessions + cookies (awkward on mobile, CSRF); managed auth like Clerk or Supabase (less learning, external dependency, conflicts with self-hosting).
- **Consequences:** A refresh single-flight lock is needed on the client. More code to own and test.

### ADR-005 — Money as integer minor units
- **Status:** Confirmed · 2026-11-04
- **Decision:** `amountMinor BigInt` + `currency Char(3)`, serialized as a string in JSON. Minor-unit exponent per ISO 4217 (TZS = 0 in practice, USD = 2).
- **Alternatives:** `Decimal(19,4)`, which is also correct, but Prisma returns `Decimal.js` objects and the arithmetic in JS is easier to get wrong; floats are rejected outright.
- **Consequences:** Formatting/parsing helpers live in `packages/shared/money.ts` with unit tests.

### ADR-006 — UTC instants + local-date columns
- **Status:** Confirmed · 2026-11-04
- **Decision:** Instants are stored as `timestamptz` (UTC). Day-semantics data (`dueDate`, `HabitCompletion.localDate`) is stored as `date`, computed in the user's IANA zone at write time.
- **Consequences:** History stays correct across travel and DST. The server needs the user's timezone (settings + `X-Timezone`).

### ADR-007 — Violet/indigo accent
- **Status:** Confirmed · 2026-11-03
- **Decision:** Brand accent `#8B7CFF` (dark) / `#5B3FE0` (light). `#8FB339` is reassigned to the success role. See [07](07-DESIGN-SYSTEM.md).

### ADR-008 — Self-hosted single VPS
- **Status:** Confirmed · 2026-11-03
- **Decision:** One Linux VPS running Docker Compose: Caddy (TLS), API, PostgreSQL, backup sidecar. Off-site backups to S3-compatible storage.
- **Alternatives:** PaaS (Railway/Render/Fly) is less ops work but costs more and teaches less; managed Postgres is safer but costs more.
- **Consequences:** We own patching, backups, monitoring and incident response (runbook in [10](10-DEPLOYMENT-STRATEGY.md)). Single point of failure, which is acceptable for the target uptime of 99.5%.

### ADR-009 — Shared Zod schemas
- **Status:** Confirmed · 2026-11-04
- **Decision:** `packages/shared` exports Zod schemas, used by RHF resolvers on mobile and a validation pipe on the API.
- **Alternatives:** `class-validator` DTOs (NestJS default), which would duplicate validation on mobile.
- **Consequences:** The shared package must stay framework-free. Changes to it affect both apps, which CI tests catch.

### ADR-010 — Online-first with persisted cache
- **Status:** Confirmed · 2026-11-04
- **Decision:** TanStack Query with a persisted cache and paused mutations. No local database or sync engine in MVP.
- **Alternatives:** WatermelonDB/PowerSync/Replicache offline-first, which is a big complexity jump.
- **Consequences:** Edits made offline replay on reconnect. Non-idempotent creates may need an `Idempotency-Key` later.

### ADR-011 — MVP scope
- **Status:** Confirmed · 2026-11-04. See [01-PRD §2](01-PRD.md#2-release-scope).

### ADR-012 — Zod → OpenAPI tooling
- **Status:** Open. Options: `nestjs-zod`, `@asteasolutions/zod-to-openapi`, or hand-written decorators. Decide during Phase 4 with a small spike.

### ADR-013 — UUIDv7 keys
- **Status:** Confirmed · 2026-11-04
- **Decision:** UUIDv7 via Prisma `uuid(7)`, stored as Postgres `uuid`. Time-ordered keys are good for B-tree locality and cursor pagination. Ids are not guessable.

### ADR-015 — Email verification is not required to start using the app
- **Status:** Confirmed · 2026-11-04
- **Decision:** New users can use the app right away, with a reminder banner. Verified email is required for data export and email change.
- **Consequences:** Less drop-off at sign-up. The `EmailVerifiedGuard` applies only to sensitive endpoints.

### ADR-014 — Local habit reminders
- **Status:** Confirmed · 2026-11-04
- **Decision:** `expo-notifications` schedules repeating local notifications from `Habit.reminderTimes`, re-synced when habits change and on app start.
- **Consequences:** Reminders still fire offline. Reminders don't sync to a second device until the app opens there. Server push is deferred to v1.2 (needed for budget alerts and challenges).

### ADR-016 — Commit directly to `main`, no branch protection or PRs (for now)
- **Status:** Confirmed · 2026-11-04
- **Context:** Solo developer. The project owner chose to skip branch protection and the PR workflow in step 3.1.
- **Decision:** Commit and push straight to `main`. CI (step 3.9) still runs on every push but doesn't block anything.
- **Consequences:** Faster, but a broken commit can land on `main`, and CI only reports it afterwards. Production deploys are triggered by tags, not pushes, so a broken `main` doesn't reach users. Revisit before the first external contributor or before the v1.0 release.

### ADR-017 — API uses NestJS 12 defaults (ESM, Vitest, oxlint); `shared` has no build step
- **Status:** Proposed · 2026-11-05
- **Context:** The brief listed Jest. NestJS 12's scaffold ships ESM output, Vitest and oxlint.
- **Decision:** Keep the scaffold defaults for `apps/api`. Mobile keeps Jest (`jest-expo`), which is what React Native Testing Library is built around. `packages/shared` is consumed as TypeScript source: Node 26 strips types at runtime for the API, and Metro compiles it for mobile.
- **Alternatives:** Swap the API to Jest (more config, fights the framework default); build `shared` with `tsc` to `dist/` (an extra watch process and build ordering).
- **Consequences:** Two test runners with near-identical APIs. `shared` is limited to erasable TypeScript (enforced by `erasableSyntaxOnly`). The API Docker image must include `packages/shared` source (Phase 11).
