# 11 — Technical Decisions (ADR Log)

| | |
|---|---|
| **Purpose** | Records *why* decisions were made, with alternatives and trade-offs |
| **Status** | Living document |
| **Last updated** | 2026-11-08 |

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
| 007 | Violet/indigo primary accent; green reserved for success | Superseded by ADR-020 |
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
| 018 | One repo-wide oxlint + Prettier setup (not ESLint); Husky + lint-staged pre-commit | Proposed |
| 019 | Authentication required by default (global guard + `@Public()`) | **Confirmed** |
| 020 | Light playful visual direction (the Nov 2026 design export) | **Confirmed** (dark variant Proposed) |
| 021 | Floating JS tab bar; platform icons via `expo-symbols`; Outfit font | Proposed |

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
- **Status:** Superseded by ADR-020 · was Confirmed 2026-11-03
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
- **Status:** Confirmed · 2026-11-08 (was Open, then Proposed)
- **Decision:** No extra library. Zod 4 exports JSON Schema itself (`z.toJSONSchema(schema, { target: 'openapi-3.0', io: 'input' })`). A ~20-line `@ZodBody(schema)` parameter decorator applies `ZodValidationPipe` **and** `@ApiBody` from the same schema, so the docs can't drift from validation.
- **Alternatives:** `nestjs-zod` (DTO classes from schemas; another dependency and its own conventions to learn); `@asteasolutions/zod-to-openapi` (registry-based, built for Zod 3 first); hand-written `@ApiProperty` DTOs (two sources of truth).
- **Consequences:** Request bodies are documented; responses aren't yet (would need a similar `@ZodResponse`). Custom checks (time zone) appear as plain strings.

### ADR-013 — UUIDv7 keys
- **Status:** Confirmed · 2026-11-04
- **Decision:** UUIDv7 via Prisma `uuid(7)`, stored as Postgres `uuid`. Time-ordered keys are good for B-tree locality and cursor pagination. Ids are not guessable.

### ADR-015 — Email verification is not required to start using the app
- **Status:** Confirmed · 2026-11-04
- **Decision:** New users can use the app right away, with a reminder banner. Verified email is required for data export and email change.
- **Consequences:** Less drop-off at sign-up. The `EmailVerifiedGuard` applies only to sensitive endpoints (built in 4.9; used by change-email, later export).

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

### ADR-018 — One repo-wide oxlint + Prettier setup; Husky + lint-staged pre-commit
- **Status:** Proposed · 2026-11-07
- **Context:** The roadmap (task 3.8) said ESLint. The API already used oxlint (ADR-017), while mobile had Expo's `expo lint` (ESLint + `eslint-config-expo`) configured but never installed. Two linters means two configs, two rule vocabularies and slower CI.
- **Decision:** One root `.oxlintrc.json` lints every workspace, run type-aware (`oxlint --type-aware`) so rules like `no-floating-promises` work. Per-folder `overrides`: Node env for the API; `react` + `jsx-a11y` plugins with `rules-of-hooks` as an error for mobile; Vitest globals for tests. Warnings fail the run (`--deny-warnings`). One root `.prettierrc` (single quotes, trailing commas, 100 columns). Markdown is excluded because docs are hand-formatted. The mobile `tsconfig` now also extends `tsconfig.base.json`, so every package gets the same strict flags. Husky runs `lint-staged` on commit: lint + format only the staged files.
- **Alternatives:** ESLint everywhere (largest plugin ecosystem, Expo's default, but much slower and more config); ESLint for mobile + oxlint for the API (two setups); Biome (linter + formatter in one, but weaker type-aware rules).
- **Consequences:** Fast linting (the whole repo in well under a second). Some niche ESLint-only rules (e.g. Expo-specific ones) aren't available. If one is ever needed, oxlint can run alongside ESLint with `eslint-plugin-oxlint` turning off the duplicated rules. Typecheck isn't in the hook (too slow per commit), so CI (3.9) catches type errors.

### ADR-019 — Authentication required by default (global guard + `@Public()`)
- **Status:** Confirmed · 2026-11-08
- **Context:** Almost every endpoint belongs to a logged-in user. With a per-route `@UseGuards(JwtAuthGuard)`, forgetting it on one new route would expose that route to anyone, and nothing would fail.
- **Decision:** Register `JwtAuthGuard` as a global `APP_GUARD`. Routes opt *out* with `@Public()` (currently `HealthController`, `AuthController`). The guard only verifies the token (no DB lookup); endpoints that load the user treat a missing or deleted account as `401`.
- **Alternatives:** `@UseGuards()` per controller (explicit, but fails open when forgotten); Passport (`@nestjs/passport` + `passport-jwt`: more indirection for one strategy).
- **Consequences:** Forgetting `@Public()` on a route that should be open gives a visible 401 in tests (fails closed). A deleted account's token works on routes that don't load the user until it expires (≤ 15 min); 4.5's sessions make revocation immediate.

### ADR-020 — Light playful visual direction (the Nov 2026 design export)
- **Status:** Confirmed · 2026-11-08 (the light theme follows the design). The dark variant is **Proposed**.
- **Context:** The project owner exported a full app design (`docs/Life OS — App Design (1).html`, 26 screens, kept locally and git-ignored because it's 7.6 MB of bundled fonts and images) and asked for every finished screen to match it. It replaces the dark-first violet look of ADR-007.
- **Decision:** The look is light-first: a pale canvas `#F3F4F9` with a soft blue wash at the top, white cards with soft blue-grey shadows, and near-black "ink" `#0F0F14` pill buttons for the main action. Violet `#5A57EE` → `#7C5CE8` is used for links and highlights; pastel tiles (sky, lime, peach, lavender, rose) back icons and chips by meaning. The font is Outfit, and Lio the mascot appears in empty states and the welcome screen. Token values are in [07](07-DESIGN-SYSTEM.md) §2. Four design colours were darkened slightly to pass WCAG AA (tested in `colors.test.ts`): success `#1E8A4F` → `#17784C`, danger text `#D2405B` → `#B42F4A`, and violet on lavender `#5A57EE` → `#4744C9` (badges only). Grey `#6B6F7B` text is never placed on the darker chips and tiles.
- **Alternatives:** Keep the dark glass design from the first export. It was replaced by this one. Make the app light-only like the design, which would drop the Appearance setting users already choose in onboarding.
- **Consequences:** Dark mode stays, as a night version of the same roles (ink becomes near-white). The design doesn't specify it, so it is Proposed until reviewed on a device. The design's game features (XP, streak chests, achievements, Lio's moods), Money and Ask Lio stay in their planned later phases (ADR-011). Screens show only what works today.

### ADR-021 — Floating JS tab bar; platform icons via `expo-symbols`; Outfit font
- **Status:** Proposed · 2026-11-08
- **Context:** The design's tab bar is a floating white pill. The current tab is a black pill with its name, and the others show icons only. The native tab bar (`expo-router/native-tabs`, used since 5.3) can't take that shape. The design draws Lucide-style line icons and uses the Outfit font.
- **Decision:** Use Expo Router's JS tabs (`expo-router/js-tabs`) with a custom `tabBar` (`src/components/tab-bar.tsx`). Each tab is announced as a tab with its name and selected state. Icons come from `expo-symbols`, which was already installed: SF Symbols on iOS and Material Symbols on Android, mapped once in `src/components/ui/icon.tsx`. This adds no icon library and the icons look native on each platform. Outfit is loaded with `expo-font` from `@expo-google-fonts/outfit`, using only the four weights in use. The splash screen stays up until the font is ready.
- **Alternatives:** Keep the native tab bar (iOS 26 glass, but not the design, and it also truncated "Habits" / "Calendar"). Use `lucide-react-native` (exact design icons, but adds `react-native-svg` and a non-native look). Use the system font.
- **Consequences:** We lose the native tab bar's automatic iOS 26 glass and its system behaviours. Ours has to keep accessibility and the safe area right by hand, and has tests. Icons differ slightly from the design's Lucide strokes. The iOS 26 tab-label truncation issue is gone.

