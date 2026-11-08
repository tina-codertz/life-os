# 12 — Learning Roadmap & Log

| | |
|---|---|
| **Purpose** | A parallel learning curriculum tied to Life OS features, plus a personal log of what was learned |
| **Status** | Living document |
| **Last updated** | 2026-11-03 |
| **Related** | [08-Roadmap](08-DEVELOPMENT-ROADMAP.md) |

---

## 1. How to use this document

For every feature, follow the cycle from the brief:

**Understand → Plan → Design → Implement → Explain → Test → Review → Document**

- **Before** a roadmap task: study the "Learn first" topics for that week.
- **During:** write the code yourself; use AI to explain, review and unblock, not to dump whole files.
- **After:** add a log entry (§4) explaining the key code *in your own words*. If you can't explain it, the task isn't done.

## 2. Curriculum by phase

| Week | Phase / feature | Learn first | Practice exercise in Life OS | Resources |
|---|---|---|---|---|
| 1 | P0 Discovery | MVP, user stories, acceptance criteria, FR vs NFR | Rewrite 3 FRs from 02 as Given/When/Then | *User Story Mapping* (Patton), Atlassian user-story guide |
| 2 | P1 Architecture | Client-server, HTTP methods/status codes, REST, modular monolith, DI, AuthN vs AuthZ | Draw the request lifecycle for `POST /tasks` from memory | MDN HTTP docs; NestJS "Fundamentals" docs |
| 2 | P1 Database | Relational modelling, normalisation (1NF–3NF), PK/FK, 1:1/1:N/M:N | Hand-write `CREATE TABLE` for Task, Habit, HabitCompletion | PostgreSQL tutorial (postgresqltutorial.com); *SQL for Mere Mortals* ch. 1–8 |
| 3 | P2 Design | Design tokens, WCAG contrast, typographic scale, 4-pt grid | Compute contrast for 3 token pairs by hand | WCAG 2.2 quick ref; Refactoring UI |
| 3–4 | P3 Setup | Git branching & PRs, Bun workspaces, npm semver, ESLint/Prettier, Docker basics, env vars | Break a build on a branch, fix via PR; run Postgres in Docker and connect with `psql` | Pro Git ch. 3; Bun workspaces docs; Docker "Get started" |
| 4 | TypeScript core | Types vs interfaces, unions, narrowing, generics, `unknown`, utility types, `strict` mode | Type `ApiResponse<T>` and `ApiError`; write `isApiError()` type guard | TS Handbook; *Effective TypeScript* items 1–30 |
| 5 | P4 Nest foundation | Modules/providers/controllers, DI container, pipes, guards, interceptors, exception filters | Implement `ZodValidationPipe` yourself (~20 lines) | NestJS docs: Pipes, Guards, Interceptors, Exception filters |
| 5 | Prisma | Schema, relations, migrations, `$transaction`, the SQL Prisma generates | Turn on query logging; compare Prisma's SQL to your hand-written SQL | Prisma docs: Relations, Migrate, Transactions |
| 6 | Auth | Hashing vs encryption, argon2, JWT structure & signing, refresh rotation, timing attacks | Decode a JWT at jwt.io; explain why the refresh token is stored hashed | OWASP Authentication & Session Management cheat sheets |
| 7 | Security basics | IDOR, mass assignment, rate limiting, CORS, HTTPS/HSTS | Write the cross-user e2e test before the endpoint | OWASP Top 10, ASVS L1 |
| 7 | Testing (API) | Jest basics, AAA pattern, test DBs, Supertest | TDD the `/users/me` endpoints | Jest docs; NestJS Testing docs |
| 8 | React fundamentals | Components, props, state, effects, rendering, keys, lifting state, context | Build `ThemeProvider` + `useTheme()` without a library | react.dev "Learn" section |
| 8 | React Native + Expo | Core components, StyleSheet, Flexbox, platform differences, Expo modules, dev builds | Build `Button` + `Card` primitives using tokens | reactnative.dev; docs.expo.dev |
| 8 | Expo Router | File-based routing, layouts, groups, redirects, deep links | Implement the auth gate in `(app)/_layout.tsx` | Expo Router docs |
| 9 | Async JS | Promises, async/await, closures, race conditions, AbortController | Implement refresh **single-flight** in the HTTP client and test concurrency | MDN Promises; javascript.info "Promises, async/await" |
| 9 | Forms | Controlled vs uncontrolled, React Hook Form, Zod resolvers | Login + Register forms using shared schemas | RHF docs; Zod docs |
| 10 | State management | Server vs client state, TanStack Query (keys, invalidation, optimistic updates), Zustand | Optimistic habit check-in with rollback | TanStack Query docs ("Important defaults", "Optimistic updates"); TkDodo blog |
| 11–12 | Tasks | Pagination (cursor vs offset), filtering, soft delete, recurrence algorithms | Implement `nextOccurrence()` TDD-style, month-end cases first | "Cursor pagination explained" (Slack eng blog) |
| 12 | SQL deeper | `JOIN`s, `GROUP BY`, indexes & `EXPLAIN ANALYZE` | Write the task-history query in raw SQL and compare plans with/without the index | Use The Index, Luke (use-the-index-luke.com) |
| 14–15 | Habits | Dates & time zones (UTC vs local, IANA, DST), pure functions, table-driven tests | Implement `computeStreak()` with the test matrix from [09](09-TESTING-STRATEGY.md) | date-fns-tz docs; "Falsehoods programmers believe about time" |
| 16 | Goals | Derived data vs stored data, M:N relations | Explain why goal progress is computed on read | — |
| 17–18 | Calendar | RRULE (RFC 5545), range queries, list virtualization | Expand a weekly event across a DST boundary in a unit test | RFC 5545 §3.3.10; `rrule` lib docs |
| 19 | Today / performance | Aggregation endpoints, N+1 queries, memoization, `React.memo`, FlashList | Measure `/today` with `autocannon` before/after optimization | React docs "Performance"; Shopify FlashList docs |
| 20 | E2E testing | Maestro flows, test data seeding | Write the register → Today flow | Maestro docs |
| 21–22 | Accessibility & perf | Screen readers, a11y props, profiling JS vs UI thread | VoiceOver walkthrough of Today, fix 3 issues | RN Accessibility docs |
| 23 | DevOps | Linux basics, SSH, firewalls, Docker Compose, reverse proxies, TLS | Provision staging from a blank VPS using only your runbook | DigitalOcean community tutorials; Caddy docs |
| 23 | CI/CD | GitHub Actions workflows, secrets, environments, image registries | Make a deploy fail on purpose and watch the rollback | GitHub Actions docs |
| 24 | Release | EAS Build/Submit, app signing, store review guidelines, OTA updates | Ship a TestFlight build, then an OTA fix | Expo EAS docs; App Store Review Guidelines |
| 25–29 | Finance | Integer money, DB transactions & isolation, aggregation, `GROUP BY` with date buckets | Implement transfers atomically; write a test proving no half-transfer on failure | Postgres docs "Transaction Isolation" |
| 30–33 | Gamification | Event-driven design, outbox pattern, idempotency, ledgers | Award XP via the outbox; replay events and prove no double-award | microservices.io "Transactional outbox" |
| 34–40 | Analytics & AI | Window functions, materialized views, LLM APIs, prompt design, evaluation, privacy | Weekly summary with a fixed evaluation set of 10 sample weeks | Postgres window functions docs; provider API docs |

### Continuous topics (throughout)
- **SOLID & clean code:** spot SRP violations in your own services during reviews.
- **Design patterns used in Life OS:** Repository (optional), Strategy (habit frequency rules), Observer/Events (gamification), Adapter (AI provider), Factory (test factories).
- **Debugging:** breakpoints in VS Code for Nest; React Native DevTools; reading stack traces; `git bisect`.
- **Technical writing:** keep [11-TECHNICAL-DECISIONS](11-TECHNICAL-DECISIONS.md) updated, with one ADR per real decision.

## 3. Skill self-assessment (update monthly)

| Skill | Nov 2026 | Target at MVP | Notes |
|---|---|---|---|
| TypeScript | ☐☐☐☐☐ | ☑☑☑☑☐ | |
| React / RN / Expo | ☐☐☐☐☐ | ☑☑☑☑☐ | |
| NestJS | ☐☐☐☐☐ | ☑☑☑☐☐ | |
| SQL / Postgres | ☐☐☐☐☐ | ☑☑☑☐☐ | |
| Testing | ☐☐☐☐☐ | ☑☑☑☐☐ | |
| Git / CI / DevOps | ☐☐☐☐☐ | ☑☑☑☐☐ | |

*(Fill in your honest starting levels.)*

## 4. Log

### Entry template
```md
### YYYY-MM-DD — <Task ID / topic>
**What I built:**
**Concepts I learned:**
**Explain it in my own words:** (the key function/flow, line by line if needed)
**What went wrong / bugs & how I diagnosed them:**
**What I'd do differently:**
**Questions still open:**
**Time spent:**
```

### 2026-11-03 — Phase 0: planning docs drafted
**What I built:** First draft of the docs set (00–12) from `planning.md`.
**Decisions confirmed:** violet accent, Bun as package manager, self-hosted VPS, docs in `life-os/docs/`.
**Next:** review 01-PRD and answer its open questions.

### 2026-11-04 — Phase 0 & 1 approved
**Decisions:** 10–15 h/week (MVP ≈ 30 calendar weeks), keep "Life OS" name, email verification via banner, all Proposed ADRs confirmed except ADR-012.
**Next:** Phase 3, project setup (block 3).

### 2026-11-04 — 3.1 Git + 3.2 Bun workspaces
**Explain it in my own words:**
- *Workspace:* a way of connecting multiple projects that belong to the same product. (Note: Bun links the local folder, `node_modules/@life-os/shared → packages/shared`, instead of downloading anything, so a change in `shared` is seen immediately by both apps.)
- *`as const`:* preserves literal values without widening them into general types. `Priority` is `'NONE' | 'LOW' | … | 'URGENT'` instead of `string`.
- *`noUncheckedIndexedAccess`:* makes TypeScript acknowledge that accessing an array index doesn't guarantee an element exists. `tasks[0]` is `Task | undefined`, so you must check before using it.
**Decision:** skipped branch protection and PRs (ADR-016).

### 2026-11-04 — 3.3 Expo app
**What was built:** `apps/mobile` from the SDK 58 default template, stripped to a single screen that imports `PRIORITIES` from `@life-os/shared`. Routes live in `src/app/`. App renamed to Life OS, scheme `lifeos`, dark splash.
**Checked:** typecheck passes, `expo-doctor` 20/20, an iOS production bundle builds and includes the shared constants.
**To learn:** what Metro is, what Expo Router's `_layout.tsx` does, Expo Go vs a development build.
**Explain it in my own words (Expo basics):**
- *Metro:* bundles the JavaScript code so React Native can execute it. (Also: it resolves imports, including workspace links like `@life-os/shared`, compiles TS/JSX, and serves the bundle to the phone with Fast Refresh.)
- *`_layout.tsx`:* the navigation manager for a group of screens. (Refinement: the folder structure decides *which* routes exist; `_layout.tsx` decides *how* they're presented, e.g. Stack vs Tabs, plus any shared wrapper or providers.)
- *Expo Go vs development build:* Expo Go is a prebuilt app that runs your project without building your own first; a development build is your own custom dev version of the app. (Key limit: Expo Go only includes the native modules Expo ships, so any library with custom native code needs a development build.)

### 2026-11-05 — 3.4 NestJS API
**Explain it in my own words:**
- *Module:* a way of organizing related parts of the backend (e.g. everything about tasks lives in `TasksModule`).
- *Controller:* handles the HTTP requests and decides what response goes back to the client.
- *Decorator:* a TypeScript feature that adds metadata to, or changes how Nest treats, a class, method or property (`@Controller('health')`, `@Get()`).
- *Why `HealthController` has no service:* it only returns static data, with no computation or database work, so a service would add complexity for nothing. (Follow-up: in 3.6 it pings the database, and *then* it gets `PrismaService` injected. That's the moment DI earns its place.)
- *Why `configureApp()` is separate:* it centralizes shared app configuration (global prefix now; CORS and validation pipes later), so the production bootstrap and the e2e tests use the same setup and the tests exercise the real configuration.

### 2026-11-05 — 3.5 PostgreSQL in Docker
**What was built:** `docker-compose.yml` running Postgres 18 (localhost-only port, named volume, healthcheck), an init script that creates `lifeos_test`, `.env.example`, and `bun run db:up | db:down | db:psql | db:reset`.
**Checked:** container healthy; `lifeos_dev` + `lifeos_test` exist; server timezone is UTC; data survives a restart.
**To learn:** image vs container vs volume; why the port is bound to `127.0.0.1`; what `db:reset` (`down -v`) destroys.
**Explain it in my own words (Docker):**
- *Image:* the packaged blueprint containing everything needed to create a container.
- *Container:* the running instance created from an image.
- *Volume:* persistent storage used by containers. It survives the container being removed.
- *Why the port is bound to `127.0.0.1`:* so the dev database isn't publicly accessible. (Refinement: 5432 is just Postgres's default port. What restricts access is the `127.0.0.1:` part, which means only programs on this Mac can connect, not other devices on the same Wi-Fi.)
- *What `db:reset` deletes:* (Refinement: `docker compose down -v` deletes the **volume**, which means all data in both `lifeos_dev` and `lifeos_test`. The fresh container then re-runs `init.sql`. Only use it when you're happy to lose local data.)

**3.3 confirmed:** the app runs in the iOS Simulator (iPhone 17).

### 2026-11-06 — 3.6 Prisma + first migration
**What was built:** Prisma 7.10.1 (stable) with `User` + `UserSettings` from docs/05; first migration `init_users`; a global `PrismaModule`/`PrismaService` (pg driver adapter); `/api/v1/health` now pings the DB and returns **503** when it's down.
**Bugs & diagnosis:**
1. `prisma@latest` installed **Prisma 8 RC**, which explains why there was no `schema.prisma` (Prisma 8 calls it `contract.prisma`). Lesson: check `npm view <pkg> dist-tags` before installing; `latest` isn't always stable.
2. `P1000 Authentication failed`, even though the password worked inside the container. Cause: a **native PostgreSQL 18 app** was also listening on port 5432, so connections from the Mac reached it instead of Docker. Fix: Docker Postgres now uses host port **5433**. Diagnosis trick: test the same credentials inside the container (worked) vs from the host (failed), which means "wrong server", not "wrong password".
3. `exactOptionalPropertyTypes` caught `url: string | undefined` in `prisma.config.ts`. The strict setting did its job.
**Checked:** typecheck, lint, unit (ok + 503 cases), e2e against `lifeos_test`, and the built server returning 200 → 503 (DB stopped) → 200 (DB back, with no API restart).
**To learn:** read the migration SQL and match each line to `schema.prisma`; what a connection pool is; why `PrismaModule` is `@Global()`.
**Your answers:**
- *Connection pool:* a collection of reusable database connections maintained by the application. (Refinement: opening a Postgres connection is slow, with a TCP handshake, authentication and a new server process, so the pool keeps a few open and lends one to each query. That's also why `PrismaService` must be a single shared instance: one pool per app, not one per request.)
- *Why `@Global()`:* the providers a global module exports can be injected anywhere without importing `PrismaModule` in every feature module. (Refinement: use it sparingly, only for truly app-wide infrastructure like the DB and config. A feature module like `TasksModule` should still be imported explicitly, so dependencies stay visible.)
- *Why 503, not 500:* 503 means the service is temporarily unable to handle requests, often because a dependency is unavailable. (Refinement: 500 says "the code is broken", while 503 says "try again later". Load balancers, Docker healthchecks and uptime monitors treat 503 as "take out of rotation / alert", which is exactly right when the DB is down.)

### 2026-11-06 — 3.7 Env config with Zod
**What was built:** `src/config/env.ts`, one Zod schema for every env var the API reads (`NODE_ENV`, `PORT`, `DATABASE_URL`). A global `ConfigModule` validates `process.env` once at startup and provides the typed result under the `ENV` token. `PrismaService` and `main.ts` read from it instead of `process.env`.
**Concepts:**
- *Fail fast:* a bad config should stop the app at startup with a clear message, not crash on the first request an hour later.
- *12-factor config:* config lives in the environment, not in code. Locally it comes from the `.env` file; in production, from the real environment.
- *Parse, don't validate:* `parseEnv` returns a **typed** object. `PORT` arrives as the string `"4000"` and leaves as the number `4000`, so the rest of the code never re-checks it.
- *Secret-safe errors:* the message names the variable and the rule it broke, never its value.
**Checked:** 13 unit tests (defaults, coercion, missing/invalid URL, non-Postgres URL, bad ports, unknown NODE_ENV, all errors listed at once, no value leaked). Also tested the built server: a bad config gives exit code 1, both problems listed, and the secret never printed; a good config gives `/health` 200.
**To learn:** why `PORT=3000.5` and `PORT=abc` fail but `PORT=4000` passes (look at `z.coerce`); why `process.loadEnvFile` doesn't overwrite a variable that is already set (try `PORT=4000 bun run start:dev`); and why is reading `process.env` directly in a service worse than injecting `ENV`? (Hint: think about tests.)
**Your answers:**
- *`z.coerce`:* converts the value to the desired type (string, number, …) but doesn't guarantee it's valid. (Refinement: exactly. Coercion runs `Number("4000")` first, then the rules after it (`.int().min(1).max(65535)`) do the validating. `Number("abc")` is `NaN` (fails "expected number"), and `Number("3000.5")` is a number but fails `.int()`. Watch out: `Number("")` is `0`, which is why `.min(1)` matters.)
- *Why the terminal value wins:* variables already provided by the OS or shell take precedence over values loaded from `.env`. (Refinement: `process.loadEnvFile` only fills in variables that aren't set yet. That's what lets production, CI and one-off commands like `PORT=4000 …` override the file without editing it.)
- *Why inject `ENV`:* easier to test and to replace dependencies. (Refinement: a test can hand `PrismaService` a fake `Env` object directly, with no need to mutate the global `process.env` and remember to restore it, which is a classic source of tests that pass alone but fail together.)

### 2026-11-07 — 3.8 Lint, format, strict TS, pre-commit hook
**What was built:** a root `.oxlintrc.json` covering all workspaces, a root `.prettierrc` + `.prettierignore`, the mobile `tsconfig` now extending the shared strict base, and root scripts `lint`, `lint:fix`, `format`, `format:check` and `check` (all three gates). Husky's pre-commit hook runs `lint-staged`. The per-package lint and Prettier configs and the API's local copies of the tools were removed (see ADR-018 for why oxlint over ESLint).
**Concepts:**
- *Linter vs formatter vs type checker:* the linter finds likely **bugs** (a hook called conditionally, a promise never awaited); the formatter only changes **layout** (quotes, line breaks); `tsc` checks **types**. Three tools, three jobs, so they don't overlap.
- *Type-aware linting:* some rules need type information. `no-floating-promises` has to know a function *returns a Promise*, so oxlint asks the TypeScript compiler (via `tsgolint`).
- *Pre-commit hook:* git runs `.husky/pre-commit` before each commit. `lint-staged` limits the work to staged files, so it stays fast as the repo grows.
- *False positives:* tune a rule to the framework instead of deleting it. NestJS modules are empty decorated classes (`allowWithDecorator`), the new JSX transform doesn't need `import React`, and Expo's `StatusBar` takes `style="light"`.
**Checked:** `bun run check` is clean (lint 0 warnings, Prettier, typecheck ×3). Throwaway files proved the rules fire: a conditional `useState` and an un-awaited promise were both reported as errors. The hook blocked a commit containing a floating promise.
**To learn:** what does `--deny-warnings` change, and why turn it on in a fresh repo rather than later? Why exclude `*.md` from Prettier? And how would you skip the hook in an emergency (and why should you almost never do that)?
**Your answers:**
- *`--deny-warnings`:* so the repo never ignores warnings that could later turn into errors; they're cleaned up as they're introduced. (Refinement: the key word is *now*. With 0 warnings, every new one is visible and belongs to the commit that added it. Turn it on in a repo with 300 warnings and nobody reads them, so it never gets turned on.)
- *Why `*.md` is excluded:* to keep a consistent code style. (Correction: the reason is the opposite. The docs have a deliberate hand-made style, with wide tables and long lines, and Prettier would rewrap and re-pad every table. That's a huge diff with no meaning that also makes the docs harder to edit. Prettier's job is consistency in **code**; Markdown here is prose.)
- *Skipping the hook:* `HUSKY=0 git commit …` (or the standard `git commit --no-verify`, which works with any hook manager). Only skip it if you'll inspect the errors yourself manually. (Refinement: since 3.9 there's a second safety net. CI runs the same checks on every push, so a skipped hook is caught a minute later, in public, with a red ❌ on the commit.)

### 2026-11-07 — 3.9 CI with GitHub Actions
**What was built:** `.github/workflows/ci.yml`, two jobs that run in parallel on every push to `main` (and on PRs or manual runs):
1. **check:** `bun install --frozen-lockfile` → `bun run check` (lint, format, typecheck) → API unit tests.
2. **api-e2e:** a throwaway **Postgres 18 service container** → `prisma migrate deploy` → `prisma:check` → e2e tests.
Node is pinned in `.node-version` and Bun in `packageManager`, so CI uses the same versions as the laptop. Also a CI badge and a Getting started section in the README.
**Concepts:**
- *`--frozen-lockfile`:* CI installs exactly what `bun.lock` says and fails if `package.json` and the lockfile disagree, so you never get "works on my machine" from a silently different dependency version.
- *Service containers:* GitHub starts Postgres next to the job and waits for its healthcheck. It's the same idea as our `docker-compose.yml`, but it exists only for that job.
- *Migration drift check:* apply every migration to an **empty** DB, then `prisma migrate diff --from-config-datasource --to-schema … --exit-code` compares the result with `schema.prisma` (exit 0 = identical, exit 2 = drift). It catches "I edited the schema but forgot `db:migrate`", a bug that would otherwise surface only when deploying to production.
- *`concurrency` + `cancel-in-progress`:* two quick pushes don't waste minutes running the older one.
- *A test that can't fail proves nothing:* green isn't enough, so I also checked it goes red.
**Checked:** the first run on `main` was green (check 23 s, e2e 35 s). On a throwaway branch with an unmigrated `nickname` column, CI went **red** at exactly the drift step (`[+] Added column nickname`, exit 2). The branch was then deleted.
**Mistake & lesson:** the probe commit used `git commit -am`, and `-a` stages **every** modified tracked file. It swept in the uncommitted `dh` edit in `docs/00`, which disappeared when the branch was deleted. It was recovered from `git reflog` (deleted commits stay reachable there for weeks) and put back uncommitted. Lesson: stage files by name for anything throwaway, and `git status` before every commit.
**To learn:** why do the two jobs run in parallel instead of one after the other, and what's the trade-off? Why does CI use a different password from your `.env`, and why is it OK for it to be in the YAML file? What would happen in CI if you added a new env var to `env.ts` but forgot to add it to the workflow?
**Your answers (given 2026-11-07, recorded 2026-11-08; I had missed them):**
- *Why parallel:* one job doesn't have to wait for the other; they're independent. (Right. The trade-off: you get the result sooner, but both jobs install dependencies separately (more total CI minutes), and the e2e job runs even when lint has already failed.)
- *Password in the YAML:* it's only created and used for the temporary database that exists during the CI run. (Right: it protects nothing that outlives the job, and it's different from your `.env`, so seeing it reveals nothing about your machine or production.)
- *New env var missing from the workflow:* environment validation fails. (Right, and loudly: the API refuses to start with "Invalid environment configuration: - JWT_ACCESS_SECRET: …", so the e2e job fails at boot instead of later. This actually came up in 4.4–4.8: each new required variable (`JWT_ACCESS_SECRET`, `SMTP_URL`) had to be added to `ci.yml` too.)

### 2026-11-07 — 4.1 Part 1: structured logging + request IDs
**What was built:** `nestjs-pino` as the app logger (`src/logging/logging.module.ts`); `genRequestId` (`src/logging/request-id.ts`) gives every request an ID, returned in `X-Request-Id`, reusing the client's ID only if it matches `^[\w-]{1,64}$`. `LOG_LEVEL` added to the env schema (default `info`, `silent` in e2e). Pretty single-line logs in development, JSON elsewhere; `Authorization`/`Cookie` are redacted; `/health` polling isn't logged.
**Concepts:**
- *Structured logging:* each log line is a JSON object, so tools can filter by field (`reqId`, `statusCode`), not grep through text.
- *Request ID / correlation ID:* one ID ties together the response a user saw and every log line the server wrote for it.
- *Middleware:* code that runs before the controller on every request (pino-http: assign ID, start timer, log on finish).
- *Redaction:* secrets are replaced with `[Redacted]` before the line is written.
- *Never trust client input, even headers:* a client-chosen ID is only accepted if it's boring.
- *`bufferLogs` + `useLogger`:* Nest logs before the pino logger exists; buffering keeps every line in one format.
**First attempt (written by me, caught by the pre-commit hook):** a missing comma in `NestFactory.create(AppModule, {…})`; trying to `import { LOG_LEVELS } from '@nestjs/common'` and assign to it (imports are read-only, and the answer was simply a key in Vitest's `env` object); then a `LOG_LEVELS` typo in that object, a silent bug because an unknown key is just ignored. Lesson: config that is "ignored when wrong" deserves a test or a look at the output.
**Checked:** lint/format/typecheck clean; 16 unit + 5 e2e tests (ID generated, safe ID reused, `<script>` ID replaced). Live server: `X-Request-Id` header present, client ID `my-test-123` shows in the log, `authorization: [Redacted]`, health requests not logged.
**To learn:** why `LoggingModule` must come after `ConfigModule` in `imports`; why `transport: undefined` wouldn't compile here (`exactOptionalPropertyTypes`); why Node refusing `\n` in a header is a security feature (hint: "header injection"); and what a log line from production would let you do if a user sends a screenshot showing the request ID.
**Your answers:**
- *Why `LoggingModule` after `ConfigModule`:* `LoggingModule` needs the configuration when it initializes. (Correction to my own question: the dependency is real, but the **order in `imports` doesn't actually matter**. Nest builds a dependency graph and creates `ENV` before anything that injects it, and `ConfigModule` is `@Global()`, so `ENV` is visible everywhere. Listing it first is only for readability: "config, then the things that use it".)
- *`transport: undefined`:* the property would be explicitly present with an `undefined` value; the strict flag catches mistakes and makes configurations predictable. (Refinement: with `exactOptionalPropertyTypes`, `transport?: X` means "either **absent** or an `X`". `undefined` isn't an `X`, so it doesn't compile. Why "present but undefined" is dangerous: `{ ...defaults, ...{ transport: undefined } }` **overwrites** a default with `undefined`, and `'transport' in opts` is `true`. Absent and undefined look the same when you read them but behave differently in spreads, `Object.keys` and `in`.)
- *Node rejecting `\n` in headers:* Node validates outgoing header values and throws a `TypeError` on invalid characters; never put user-controlled input into headers without validating it, even with Node's protection. (Refinement: the attack is **header injection / response splitting**. A `\r\n` ends the header line, so whatever follows becomes the attacker's own header (e.g. `Set-Cookie`) or even a fake response body. Our regex plus Node's check is *defence in depth*: two independent layers, so one bug isn't enough.)
- *The screenshot with a request ID:* tracing yes, but it's not a credential and must never authorize access. (Good security instinct, since the client chooses it. The other half: you can **search the logs for that ID** and get the exact request (method, URL, status, duration and, after Part 2, the error and stack trace) without asking the user to reproduce the bug or reveal anything personal.)

### 2026-11-07 — 4.1 Part 2: one error shape for everything
**What was built:**
- `AppException(status, code, message, { details, cause })` (`src/common/errors`): the one exception features throw.
- `AllExceptionsFilter` (`src/common/filters`), registered with `APP_FILTER`, turns *anything* thrown into `{ error: { code, message, details, requestId } }`:
  - `AppException` → its own status/code/message/details;
  - Nest's built-in exceptions → code by status (404 `NOT_FOUND`, 400 `VALIDATION_FAILED`, …);
  - Prisma `P2002` → 409 `CONFLICT`, `P2025` → 404 `NOT_FOUND` (both checked against the real DB first);
  - everything else → 500 `INTERNAL_ERROR` with a generic message.
- 5xx errors are logged with the original error and its `cause`; request log lines are now `warn` for 4xx, `error` for 5xx.
- `ApiErrorBody` + `COMMON_ERROR_CODES` in `packages/shared` for the mobile client later.
- Health now throws `AppException(503, 'SERVICE_UNAVAILABLE', …, { cause })`.
- `test/utils/create-test-app.ts` so every e2e file boots the real app the same way.
**Concepts:**
- *Exception filter:* the last stop for an error on its way out. `@Catch()` with no arguments catches everything, so no error can leave in a different shape.
- *Stable error codes:* the app switches on `code` (`EMAIL_TAKEN` → show "already registered"), never on the human `message`, which can be reworded or translated.
- *Don't leak internals:* a 500's real message may contain hostnames, SQL or secrets. The client gets "Something went wrong"; the logs get everything, linked by the request ID.
- *`cause`:* wraps the low-level error (`ECONNREFUSED`) inside the meaningful one (`SERVICE_UNAVAILABLE`), so you keep both.
- *`APP_FILTER` vs `app.useGlobalFilters()`:* the provider version gets dependency injection (our logger) and is part of `AppModule`, so e2e tests get it automatically.
**Bug found while testing:** a malformed JSON body returned `"requestId":"undefined"` and no header. Express's body parser runs **before** the logging middleware, so the request never got an ID. Fix: the filter creates the ID when it's missing. Found only because I tested it rather than assuming it worked.
**Lint caught:** `String(req.id)` where the logger's type allows an object, which would produce `"[object Object]"`. Fixed with a `typeof … === 'string'` check. `no-unsafe-type-assertion` is now off for test files only, where partial fake objects (`as unknown as X`) are the point.
**Checked:** 33 unit + 7 e2e tests; live: 404 / bad JSON / DB-down 503 all in the envelope with matching `X-Request-Id`, recovery to 200 when the DB came back, and the log line for the 503 contains `ECONNREFUSED` while the response doesn't.
**To learn:**
1. Why does the mobile app switch on `code` and not on `message`?
2. Why is P2002 mapped to a generic `CONFLICT` here, when the register endpoint will want `EMAIL_TAKEN`? Where should that more specific error be thrown?
3. Why are 4xx errors *not* logged by the filter, but 5xx errors are?
4. Why might a 404 be the right answer when user A requests user B's task, even though it exists (docs/06)?
**Your answers (2026-11-08):**
- *`code` not `message`:* the code is the stable identifier; messages can be reworded and the app would stop recognising them. (Right. Add translation: once the app is in Swahili and English, the message differs per language but the code never does.)
- *Where `EMAIL_TAKEN` is thrown:* in the service layer, in `AuthService`'s register method, because "is this email free?" is a business rule. (Right. One detail for 4.4: checking first and then inserting leaves a gap where two sign-ups with the same email both pass the check. The unique index still stops the second one with P2002, so the service should **also catch P2002 on `email`** and rethrow `EMAIL_TAKEN`. The filter can't do it: it only knows "some unique value clashed", not what that means to the business.)
- *Why 5xx logged, 4xx not:* 5xx are problems a developer has to investigate (e.g. the database); the point is separating client-side from server-side errors. (Right. Note that 4xx aren't *invisible*: the request log line already records them at `warn` with status and request ID. The filter just doesn't add a stack trace, because a wrong password is not a bug, and logging a stack for every bad request would let anyone flood the logs.)
- *404 for someone else's task:* if attackers can tell "exists" from "doesn't exist" they can enumerate other users' IDs. (Exactly. A 403 would confirm the task exists. In practice it falls out naturally: every query includes `where: { id, userId }`, so another user's task simply *is* not found.)

### 2026-11-07 — 4.1 Part 3: one success shape
**What was built:** `ResponseEnvelopeInterceptor` (`src/common/interceptors`), registered with `APP_INTERCEPTOR`, wraps every controller result in `{ data }`. `Page` (`src/common/pagination`): return `new Page(items, { nextCursor, hasMore })` from a list endpoint to get `{ data, meta }`. `undefined` (for 204 No Content) and `StreamableFile` downloads pass through unwrapped. `/health` now returns `{ data: { status, db } }`. Types `ApiDataBody`, `ApiPageBody`, `PageMeta` in `packages/shared`.
**Concepts:**
- *Interceptor:* code that wraps the controller call, running both **before** and **after** it. Ours only uses "after": `next.handle()` is an RxJS **Observable** of the controller's result, and `map(toEnvelope)` transforms that value on its way out.
- *Errors skip interceptors:* a thrown exception never reaches `map`; it goes to the exception filter. Success → interceptor → `{ data }`; failure → filter → `{ error }`. The client checks one key to know which one it got.
- *Why an envelope at all:* room to grow. `meta` for pagination today; warnings or deprecation notices later, without breaking the shape the app already parses.
- *Class + `instanceof` for `Page`:* a marker that can't be faked by accident. A task that happened to have `items` and `meta` fields would otherwise be mistaken for a page.
- *Pure function + thin class:* the logic is in `toEnvelope` (easy to test with plain values); the Nest class just plugs it in. Same pattern as `toApiError` in the filter.
**Checked:** 41 unit tests (single resource, array, `Page`, look-alike object, `null`, `undefined`, file, the interceptor itself), 7 e2e; live: `/health` → `{"data":{…}}` 200, unknown route still the `{ error }` shape 404.
**4.1 complete.** The request pipeline is now: logger middleware (request ID) → controller → interceptor `{ data }`, or → filter `{ error }` → log line with status, duration and request ID.
**To learn:** (answer together with the 4.1 Part 2 questions)
1. What's the difference between middleware, an interceptor and an exception filter? When does each run?
2. Why must a DELETE that returns 204 have an empty body, and what would break if we wrapped it as `{ data: undefined }`?
3. Why is `toEnvelope` exported as a plain function separate from the class?
**Your answers (2026-11-08):**
- *Middleware / interceptor / filter:* middleware works on incoming requests, an interceptor wraps the execution of a request, an exception filter handles errors. (Right. The order completes the picture: **middleware → guards → interceptors (before) → pipes → controller → interceptors (after)**, and the filter catches a throw from any of those steps. Middleware runs before Nest even knows which controller will handle the request; interceptors, guards and pipes do know. Pipes are what 4.2 adds.)
- *204 empty body:* it says the request succeeded and there is nothing to return. (Right. And the spec forbids a body on a 204, so clients don't read one. `{ data: undefined }` serialises to `{}`, which *is* a body: Node drops it or, with some clients and proxies, the stray bytes get read as the start of the next response on the same connection.)
- *Why `toEnvelope` is separate:* separation of concerns, reusability, testability. (Right. Concretely: the tests call `toEnvelope(value)` with plain values, no Nest `ExecutionContext` and no RxJS Observable to fake.)

### 2026-11-08 — 4.2 Zod validation pipe + shared schemas
**What was built:**
- `ZodValidationPipe(schema)` (`apps/api/src/common/pipes`): validates one controller argument (`@Body`, `@Query`, `@Param`) and hands the controller the **parsed** value. Invalid input throws `AppException(400, 'VALIDATION_FAILED', …)` with one `{ field, message }` detail per problem; the filter from 4.1 turns it into the envelope.
- First shared schema: `paginationQuerySchema` (`packages/shared/src/schemas`), `?limit` 1–100 (default 30) and an optional `cursor`. `packages/shared` now depends on `zod` and has its own Vitest tests, run in CI.
- `createTestApp({ controllers })` mounts test-only endpoints, so the pipe is tested through the real app (logger → pipe → filter → envelope) before any feature uses it.
- `rewriteRelativeImportExtensions` (API) and `allowImportingTsExtensions` (mobile) so both type-checks accept `shared`'s `.ts` imports. Checked that `node dist/main` and the Expo bundle both still load `shared`.
**Concepts:**
- *Pipe:* runs on a controller argument just before the controller, and can **transform** it (string `"5"` → number `5`) or **reject** it. Order: middleware → guards → interceptors → **pipes** → controller.
- *Parse, don't validate:* the pipe doesn't just say yes/no; it returns a new value whose *type* proves it was checked. After the pipe, `body.title` is a `string`, not `unknown`.
- *Strip unknown keys:* `z.object` drops fields it doesn't know. If a client sends `{ title, userId: "someone-else" }`, the controller never sees `userId`. This blocks *mass assignment* (copying the whole body into a database row). We strip rather than reject, so an older app version sending an extra field doesn't break.
- *Shape vs rules:* the pipe checks **shape** (types, lengths, formats). Rules that need the database or the user's data ("email already taken", "backfill > 7 days") belong in the service: 409/422, not 400.
- *One schema, two places:* the mobile form and the API use the same schema, so they can't disagree. The client check is for a nice UX; the server check is the one that counts, because anyone can call the API without the app.
- *Don't echo input:* Zod messages describe the rule ("expected string to have >=12 characters"), never the value, so a rejected password never comes back in a response or log.
**Mistake I made:** first draft of the "never echoes the value" test used a *valid* body, so nothing was thrown; the test failed instead of passing silently. A test that can't fail proves nothing; this one failed for the right reason, and the fix was the input, not the assertion.
**Checked:** lint/format/typecheck clean; 46 API unit + 8 shared unit + 11 e2e tests (parsed body + coerced query reach the controller, unknown key dropped; 400 with `title`/`done` details; bad `?limit=500`; no body at all). Production build boots and serves `/health`; the iOS bundle builds.
**To learn:**
1. The pipe returns `result.data`, not the original `value`. What would go wrong if it returned `value` after a successful parse? (Think `?limit=5` and `{ userId }`.)
2. Why is "email already taken" not checked in the Zod schema, even though Zod supports async refinements that could query the database?
3. If the mobile app already validates the form with the same schema, why must the API validate again?
4. Why do we *strip* unknown keys instead of rejecting them with `z.strictObject`? When would rejecting be the better choice?
**Your answers (2026-11-08):**
- *Returning `value` instead of `result.data`:* the unvalidated `userId` would continue into the application. (Right, that's the security half. The other half is correctness: `limit` would still be the **string** `"5"` and the default `30` would never be applied, while TypeScript claims it's a number. The types would lie.)
- *Why "email taken" isn't in the schema:* Zod checks structure (is this a well-formed email?); whether it's already registered is a business rule for the service. Zod validates the shape, the service enforces business rules, the database protects integrity. (A good three-layer summary. Also practical: the same schema runs in the mobile app, which has no database, and a schema that queries the DB couldn't be shared.)
- *Why the API checks again:* the app and the API are two separate trust boundaries; frontend validation is for usability, backend validation for security and correctness. (Exactly. Anyone can call the API with `curl`, skipping the app entirely.)
- *Strip vs reject:* the API keeps the useful fields and ignores unknown ones; rejecting is better when unexpected data could hide a mistake or create a security problem. (Right. Concrete examples where we'd use `z.strictObject`: a typo like `dueDte` silently ignored means the user's due date is lost, so rejecting helps catch client bugs during development; and admin or security-sensitive endpoints, where an unexpected field is more likely an attack than an old app version.)

### 2026-11-08 — 4.3 Test database harness
**What was built:**
- `test/global-setup.ts` (Vitest `globalSetup`, runs once before all e2e files): checks that `DATABASE_URL_TEST` names a database ending in `_test`, then runs `prisma migrate deploy` on it.
- `resetDatabase(prisma)` (`test/utils/test-db.ts`): `TRUNCATE … RESTART IDENTITY CASCADE` on every table except `_prisma_migrations`, called in `beforeEach`. It asks Postgres for `current_database()` and refuses unless it ends in `_test`.
- `test/factories.ts`: `createUser(prisma, overrides)` with unique defaults (placeholder password hash until 4.4).
- e2e files now run one at a time (`fileParallelism: false`).
**Concepts:**
- *Test isolation:* every test starts from the same known state (empty tables) and creates what it needs. Then tests can run in any order, alone or together, and a failure points at that test, not at data left behind by another one.
- *TRUNCATE vs DELETE:* `DELETE` removes rows one by one; `TRUNCATE` empties the table in one go, much faster. `CASCADE` empties tables that reference it (`UserSettings` → `User`); `RESTART IDENTITY` resets auto-increment counters.
- *Guard rails on destructive tools:* the helper deletes everything, so it checks the database name **twice**: from the URL before migrating, and from Postgres itself before truncating. A wrong line in `.env` must not be able to wipe your real data.
- *Global setup:* code that runs once per test run, outside the test files. Applying migrations there means a new migration never breaks tests with "table does not exist".
- *Why files run serially:* they share one database. File A's `beforeEach` truncate could empty the tables while file B is halfway through a test, giving random failures (*flaky tests*). The alternative (one database schema per parallel worker) is faster but more complex; not worth it at 2 seconds.
- *Factories, not fixtures:* a fixture is a shared dataset every test depends on; changing it for one test breaks others. A factory makes fresh data per test, with only the interesting fields spelled out (`createUser(prisma, { displayName: 'Tina' })`).
- *`$executeRawUnsafe`:* "unsafe" because it takes a plain string, so user input in it would be SQL injection. Here the table names come from Postgres' own catalog and are quoted, so it's safe. Everywhere else we use the tagged template `` $queryRaw`…` ``, which sends values as parameters.
**Checked it can fail:** pointed at `lifeos_dev` → "Refusing to touch database "lifeos_dev""; dropped the whole test schema → global setup re-migrated it and all tests passed; commented out the reset → the "empty tables" test failed.
**Checked:** 53 API unit + 8 shared unit + 14 e2e tests; lint/format/typecheck clean.
**To learn:**
1. Why does the test check the database name from Postgres (`current_database()`) and not only from the URL?
2. What is a *flaky test*, and how would running e2e files in parallel against one database create one?
3. Why is a factory with overrides better than one shared "test user" every test uses?
4. `$queryRaw` with a template literal vs `$executeRawUnsafe` with a string: why is the first safe against SQL injection?
**Your answers (2026-11-08):**
- *Why ask Postgres, not just the URL:* the URL says where you *intend* to connect; Postgres says where you *actually* connected. The name check alone isn't a complete guarantee: also restrict reset permissions, validate the expected environment, and make sure the reset runs on the same connection that was checked. (Very good, and beyond what the question asked. Where each idea stands here: **same connection:** the check and the `TRUNCATE` can go to different connections in Prisma's pool; they all use one URL, so it's the same database today, but wrapping both in one `$transaction` would make it a guarantee rather than an assumption. **Expected environment:** adding `NODE_ENV === 'test'` (which Vitest sets) to the guard is a cheap second condition. **Permissions:** a separate database user that only has rights on `lifeos_test` is the strongest layer, because then even a buggy guard couldn't touch `lifeos_dev`; it's an ops change for the deployment phase.)
- *Flaky test:* sometimes passes, sometimes fails without any code change; tests sharing a user or a badly timed cleanup interfere with each other's database state. (Right. The nasty part is the timing: it fails only when two files happen to overlap, so it can pass ten times locally and fail once in CI.)
- *Factory vs shared user:* each test carries its own data, so it's predictable, ready for parallel runs, and clear about what it needs. (Right.)
- *`$queryRaw` template:* the value is sent as a SQL **parameter**, not as SQL code, so it can't be injected. (Right. Mechanically: the tagged template splits the query into the fixed text (`… WHERE id = $1`) and the values, and sends them to Postgres separately. The value never becomes part of the SQL text, so `'; DROP TABLE "User"; --` is just an odd string to compare against.)
**Follow-up (from your answer):** `resetDatabase` now runs the name check and the `TRUNCATE` inside one `prisma.$transaction(async (tx) => …)`, which keeps both on one connection, and both it and the global setup require `NODE_ENV=test`. Probe: `NODE_ENV=development bun run test:e2e` → "Refusing to run test database helpers with NODE_ENV="development"". Separate database user: deferred to deployment (Phase 10).

### 2026-11-08 — 4.4 Part 1: register + password hashing
**What was built:**
- `registerSchema` / `loginSchema` / `PublicUser` in `packages/shared` (`schemas/auth.ts`). Email is trimmed and lowercased; password 10–128 characters and not in `COMMON_PASSWORDS` (the 1,000 most-used passwords of 10+ characters from SecLists, generated into `schemas/common-passwords.ts`, ~13 KB since it also ships in the app).
- `PasswordService` (`modules/auth`): argon2id via `@node-rs/argon2` with OWASP's minimum (19 MiB, 2 passes, 1 thread).
- `POST /auth/register` → `201 { data: { user } }`; creates the user and a default `UserSettings` row in one `create`.
- `isUniqueViolation(err, 'User', 'email')` (`src/prisma/prisma-errors.ts`) + `EmailTakenError` (409 `EMAIL_TAKEN`).
- `toPublicUser()`: lists the fields to send one by one.
**Concepts:**
- *Hashing, not encryption:* encryption can be reversed with a key; a hash can't. To log in we hash the attempt and compare. If the database leaks, the attacker has hashes, not passwords.
- *Slow on purpose:* a normal hash (SHA-256) is built to be fast, so an attacker with a GPU tries billions of guesses per second. argon2id costs ~10 ms of CPU and 19 MiB of memory **per guess** (measured on this Mac); the memory part is what GPUs are bad at.
- *Salt:* random bytes mixed into each hash, so two users with the same password get different hashes and precomputed tables ("rainbow tables") are useless. argon2 stores salt and settings inside the hash string, so settings can be raised later.
- *Common-password check:* length alone lets `1234567890` through. Attackers try the popular passwords first, so blocking them removes the cheapest guesses.
- *Normalise before you store:* `Tina@Example.com` and `tina@example.com` must be one account. Lowercasing in the shared schema means the API, the database and the app all see the same value.
- *The database is the real uniqueness check:* checking "does this email exist?" then inserting has a gap (*race condition*: two sign-ups both pass the check). The unique index can't be raced, so the service just inserts and translates P2002 into `EMAIL_TAKEN`.
- *Allow-list the output:* `toPublicUser` names each field. `...user` would send `passwordHash`, and any column added later, to every client.
**Found while building:**
- Through the pg driver adapter, P2002 doesn't carry the usual `meta.target: ['email']`, only the index name `User_email_key`. A check copied from older Prisma tutorials would never match, and sign-ups would get the generic `CONFLICT` instead of `EMAIL_TAKEN`. Probed the real error first, then wrote the helper for both shapes.
- I broke the helper on purpose to see which tests notice. The "two sign-ups at once" test still **passed**, because the filter's generic P2002 mapping also answers 409, and the test only checked status codes. Now it also requires `code: 'EMAIL_TAKEN'`, and fails when the helper is broken.
- The pre-commit hook blocked my first commit: a cast (`as { cause?: … }`) on Prisma's untyped `meta` (replaced with an `isRecord` type guard at each level, so a different shape returns `false` instead of crashing), `.sort()` without a compare function (JavaScript sorts numbers *as text*: `[1000, 201].sort()` → `[1000, 201]`), and `.sort()` mutating the array (now `.toSorted()`).
- Chose `@node-rs/argon2` over `argon2`: the latter compiles/downloads its binary in an install script, which Bun doesn't run by default.
**Checked:** 65 API unit + 22 shared unit + 20 e2e (response has no password data; stored hash is argon2id; default settings created; `role: 'ADMIN'` ignored; duplicate in different case → 409; simultaneous sign-ups → exactly one 201 and one `EMAIL_TAKEN`; 400 details). Race test repeated 5×. Live production build: 201, then 409 `EMAIL_TAKEN`, then 400 for a common password; password absent from the logs. Probe user deleted from `lifeos_dev` afterwards.
**To learn:**
1. Why is a *slow* hash better for passwords, when we normally want code to be fast?
2. What does the salt protect against, and why is it fine that it's stored right next to the hash?
3. Register answers `EMAIL_TAKEN`, which tells anyone whether an email has an account. Why do we accept that here, but not on login or forgot-password?
4. Why does `toPublicUser` list the fields one by one instead of removing `passwordHash` from the object?

### 2026-11-08 — 4.4 Part 2: login + access tokens
**What was built:**
- `JWT_ACCESS_SECRET` in the env schema (required, ≥ 32 characters), `.env.example` (placeholder + how to generate one), CI (throwaway value). A random value was added to the local `.env` without printing it.
- `TokenService` (`modules/auth`, library `jose`): `signAccessToken({ userId })` and `verifyAccessToken(token)`. HS256, 15 minutes, `sub`/`iss`/`aud`/`iat`/`exp`.
- `POST /auth/login` → `200 { data: { user, accessToken } }`; register now also returns `accessToken` (FR-AUTH-001: logged in straight away).
- `InvalidCredentialsError` → `401 INVALID_CREDENTIALS`, for unknown email, wrong password and deleted account alike.
**Concepts:**
- *JWT:* three base64url parts, `header.payload.signature`. The signature is an HMAC of the first two with the secret: change one character of the payload and it no longer matches. It's **signed, not encrypted**: anyone can read the payload, so it holds an ID, never personal data.
- *Stateless access token:* the API checks a token with maths alone, no database lookup. The price: it can't be cancelled before it expires, hence only 15 minutes, with refresh tokens (4.5, stored in the database, *can* be revoked) to get new ones.
- *Pin the algorithm:* a classic JWT attack is a token with `"alg": "none"` (no signature) or a switched algorithm. `algorithms: ['HS256']` refuses anything else; a test proves `none` is rejected.
- *`iss` / `aud`:* who made the token and who it's for. A token signed with the same key for another purpose (a future email link, say) can't be used as an access token.
- *Don't reveal which emails exist:* one error code and message for every login failure. And one *timing*: without a hash to check, "unknown email" would answer ~10 ms faster than "wrong password", and an attacker could measure that. So an unknown email still verifies against a dummy hash. Measured live: median 11.1 ms vs 10.8 ms.
- *Secrets:* the signing key can mint a token for any user. Validated at startup like everything else, never printed (a test proves the error message doesn't contain it), different per environment.
- *200 vs 201:* register creates a user (201); login creates nothing the client can fetch (200).
**Mistakes I caught:** the edited-payload test first decoded an empty string instead of the real payload, so it tested nothing useful; rewritten before running. A code comment claimed argon2 takes 30–50 ms; measured, it's ~11 ms on this Mac, so I corrected the comment and the Part 1 log entry.
**Checked:** 73 API unit (7 token tests: round-trip, 15-min expiry, payload keys, expired, wrong secret, edited payload, `alg: none`, wrong audience) + 22 shared + 26 e2e (login 200 and the token verifies to that user; any-case email; wrong password and unknown email give identical 401s; deleted account 401; `short` password → 401 not 400; missing password → 400). Live production build: register 201, login 200, timing equal, password absent from logs, probe user deleted.
**To learn:**
1. A JWT's payload can be read by anyone holding it. So what *does* the signature protect?
2. Why can't we "log out" an access token, and how does a 15-minute lifetime make that acceptable?
3. Why does an unknown email still run a password check against a dummy hash?
4. What would go wrong if `verifyAccessToken` accepted whatever algorithm the token's header names?

### 2026-11-08 — 4.4 Part 3: protecting routes
**What was built:**
- `JwtAuthGuard` (`modules/auth`), registered globally with `APP_GUARD`: reads `Authorization: Bearer <token>`, verifies it with `TokenService`, sets `req.user = { id }`. Any failure → `401 UNAUTHENTICATED` "Log in to continue." plus `WWW-Authenticate: Bearer`.
- `@Public()` opts a controller or method out (health, auth, the test-only validation controller).
- `@CurrentUser()` parameter decorator; `req.user` added to Express's `Request` type (`auth-user.ts`, *declaration merging*).
- `GET /users/me` (`modules/users`, the read part of 4.7) returns `PublicUser`; `401` if the account was deleted. `toPublicUser` moved to `modules/users`.
- ADR-019 (Proposed): authentication required by default.
**Concepts:**
- *Guard:* answers one question before the handler runs: may this request continue? It runs after middleware and before interceptors and pipes, so an anonymous request never reaches validation or your code.
- *Secure by default (fail closed):* with one global guard, a new route is protected automatically. Forgetting `@Public()` gives a 401 you'll notice in the first test; forgetting `@UseGuards()` would give a silent hole.
- *Metadata + Reflector:* `@Public()` doesn't do anything itself; it attaches a label to the method/class. The guard reads it with `reflector.getAllAndOverride(...)`, checking the method first, then the controller.
- *Authentication vs authorisation:* the guard answers *who are you?* (401 when it can't tell). *May you touch this task?* is authorisation, answered later by queries scoped to `userId` (404 for someone else's).
- *Identity comes only from the token:* `@CurrentUser()` reads the verified token's `sub`, never an ID from the URL or body (NFR-SEC-003), so a user can only ever act as themselves.
- *Stateless check, stateful edge case:* the guard doesn't touch the database (fast), so a deleted user's token still passes the guard for up to 15 minutes; `/users/me` loads the user and answers 401. Sessions (4.5) will close that gap.
- *401 vs 403:* 401 = "I don't know who you are" (log in / refresh); 403 = "I know who you are, and the answer is no".
**Checked it can fail:** removing `@Public()` from health made the health tests fail with 401; un-registering the global guard made 8 tests fail.
**Lint caught:** passing class methods around unbound in the guard spec (now plain functions labelled with `Public()`), and a side-effect import (`import './auth-user.js'`, replaced by an explicit `import type`).
**Checked:** 86 API unit (guard: public route, no token + header, invalid token keeps `cause`, valid token sets `req.user`; `bearerToken` parsing) + 22 shared + 36 e2e (`/users/me`: valid 200; no header / Basic / malformed → identical 401 envelope + `WWW-Authenticate`; other secret, expired, deleted account, non-existent user → 401; health/register/login still public; unknown route still 404). Live production build: 401 without token, 200 with it, `authorization: [Redacted]` and the token absent from the logs; probe user deleted.
**4.4 complete:** register → token → protected routes work end to end.
**To learn:**
1. What's the difference between a guard and middleware? Why is the auth check a guard here?
2. Why is "every route protected unless `@Public()`" safer than adding `@UseGuards()` where needed?
3. 401 or 403: which one for "no token", and which one for "valid token, but you're not an admin"?
4. A user deletes their account. Why does their access token still pass the guard, and what limits the damage?

### 2026-11-08 — 4.5 Sessions: refresh rotation, logout, reuse detection
**What was built:**
- Migration `add_sessions`: the `Session` table from docs/05 (one row per refresh token, grouped by `familyId`).
- `SessionService` (`modules/auth`): `start` (login/register → new family), `rotate` (refresh), `revokeFamilyOf` (logout), `revokeAll` (logout-all). Refresh tokens are 32 random bytes; only their SHA-256 is stored.
- Endpoints: `POST /auth/refresh` (200 `{ accessToken, refreshToken }`), `POST /auth/logout` (204), `POST /auth/logout-all` (204, needs an access token). Register/login now also return `refreshToken` and accept `deviceName`.
- Access tokens carry `sid` (the family ID); `req.user` is `{ id, sessionId }`.
- `INVALID_REFRESH_TOKEN` (401) for every refresh failure.
**Concepts:**
- *Two tokens, two jobs:* the access token is checked on every request with no database lookup (fast) but can't be cancelled, so it lives 15 minutes. The refresh token is checked against the database (slower, but rare), so it *can* be cancelled, and lives 30 days.
- *Rotation:* every refresh swaps the token for a new one, so a stolen refresh token is only good until the real app next refreshes.
- *Reuse detection:* a used token coming back means two copies exist, and we can't tell which one is the thief's. So the whole family (that login) is revoked; the real user logs in again, the thief is locked out.
- *Hash, but fast:* refresh tokens are 256 random bits, impossible to guess, so SHA-256 is enough. Slow hashing (argon2) is only needed for things *people* choose. Storing the hash means a leaked `Session` table can't be replayed.
- *Compare-and-set:* `UPDATE … WHERE id = ? AND rotatedAt IS NULL` and check that one row changed. Postgres makes a second concurrent UPDATE wait for the first, re-checks the condition, and finds nothing to update. Reading "not rotated yet" and then writing would let two requests both pass the read.
- *Logout is public and always 204:* it must work when the access token has already expired, and answering "unknown token" would tell an attacker which tokens exist.
**Found while building:**
- **Wiring trap:** the app wouldn't boot with `@InjectPinoLogger(SessionService.name)`. `nestjs-pino` collects those decorators when `LoggingModule` is *loaded*, so only classes imported before it get a logger. `AllExceptionsFilter` had only worked because of the import order in `app.module.ts`. Both now inject `PinoLogger` and call `setContext()`, which doesn't depend on order. Caught by the e2e tests, which boot the real app.
- **A test that never raced:** with the compare-and-set removed, the "two simultaneous refreshes" test still passed. Over HTTP one request finished before the other even read the row, so it took the plain "already rotated" path. Rewritten with a barrier that holds each read until both have read, which forces the worst interleaving every time. Now removing the compare-and-set fails it, and it passed 5/5 runs with the real code.
- **Tests failing for the wrong reason:** after adding the required `sid` claim, hand-built test tokens (wrong secret, expired, `alg: none`) would have been rejected for missing `sid` instead of what they test. They now include `sid`, and a separate test covers "no `sid`".
**Trade-off accepted:** the strict reuse rule means a lost refresh response followed by a retry logs the user out. The app must refresh single-flight (docs/04). If it bites in practice, add a short grace window.
**Checked:** 87 API unit + 22 shared + 47 e2e (hash stored, not token; `sid` = family; refresh gives a working new pair; reuse → 401 and the newer token dies too; forced race → exactly one 200; unknown/expired/deleted → 401; logout ends one device only; unknown-token logout 204; logout-all needs auth and ends all devices; two logins = two families). Probes: removing the compare-and-set or the family revocation each fails tests. Live production build: refresh, reuse 401, newer token 401, warning logged with `SessionService` context, family and user IDs, and request ID; no token in the logs; probe user deleted (sessions removed by cascade).
**To learn:**
1. Why does a refresh token need to be stored in the database when the access token doesn't?
2. When a used refresh token comes back, why revoke the *whole family* instead of just rejecting that one request?
3. Why is SHA-256 fine for refresh tokens when passwords need argon2?
4. Two requests both read "not rotated yet" and then both write. What does the compare-and-set do differently, and why couldn't the old race test notice it was missing?
5. After logout, the access token still works for up to 15 minutes. Why is that acceptable?

### 2026-11-08 — 4.6 Email verification + password reset
**What was built:**
- Mailpit in docker-compose (`bun run db:up` starts it; inbox at http://localhost:8025) and as a CI service container.
- Env: `SMTP_URL` (required), `MAIL_FROM`, `EMAIL_LINK_BASE_URL` (default `lifeos://`). `SMTP_URL=smtp://localhost:1025` was added to the local `.env`.
- Migration `add_auth_tokens`: the `AuthToken` table from docs/05.
- `MailService` (`src/mail`, nodemailer), plain-text templates (`modules/auth/emails.ts`).
- `AuthTokenService`: `issue` (deletes older unused tokens of that type) and `consume` (checks type, expiry, use and deleted account; compare-and-set on `usedAt`).
- `common/crypto/opaque-token.ts`: the random-token + SHA-256 helpers, now shared by sessions and email links.
- Endpoints: `verify-email`, `resend-verification` (authenticated), `forgot-password`, `reset-password`, all `204`. Register sends the verification email. `INVALID_LINK` (400).
**Concepts:**
- *One-time tokens:* the same recipe as refresh tokens: random, only the hash stored, used once (compare-and-set). Different lifetimes for different risks: a reset link can take over the account (1 hour), a verification link can't (48 hours).
- *Only the newest link works:* issuing a new token deletes the older unused ones, so an old email lying in an inbox stops being useful.
- *Separate purposes:* each token has a `type`; a verification link can't be used to reset a password, even though both are just random strings.
- *Timing, again:* forgot-password must look the same for known and unknown emails. Awaiting "create token + send email" would make known emails slower, so that work runs in the background after the response (`void promise.catch(log)`). Measured live: 1.7 ms vs 1.6 ms.
- *Fail soft where it's safe:* if the mail server is down, register still succeeds (logged, user can resend), because ADR-015 lets unverified users use the app. Reset-password is the opposite: the token is consumed **inside the same transaction** as the password change and session revocation, so either all of it happens or none, and a failure doesn't burn the link.
- *Reset = log out everywhere:* if someone else knew the old password, their sessions must die with it.
- *Integration testing with a real mail server:* the e2e tests send real SMTP to Mailpit and read the emails back through its API, so "the email arrives and its link works" is tested end to end.
**Found while building:**
- My first probe (removing the link-type check) "passed" because Prettier had split that condition across lines and my `sed` matched nothing: the code never changed. Re-done properly, the test catches it. Lesson: a probe must first prove it changed the code (I now check with `grep -c`).
**Checked:** 93 API unit + 22 shared + 58 e2e (register email arrives with a working link that works once; only the hash stored; resend needs auth and only the newest link works; resend no-op when verified; expired/made-up link 400; forgot-password for an unknown email sends nothing; reset sets the password, kills old sessions, works once, verifies the email; weak new password → 400 without using the link; verification link refused for reset; reset link > 1 h refused). Probes: removing the type check or the session revocation each fails a test. Live production build: forgot-password timing equal; with Mailpit stopped, register still 201 and the failure logged with `ECONNREFUSED`; no tokens in the logs; probe users deleted.
**To learn:**
1. Why does a password-reset link expire after 1 hour but a verification link after 48?
2. Why does forgot-password create the token and send the email *after* answering?
3. Why must the reset token be consumed in the same transaction as the password change?
4. Why does a password reset log the user out of every device?
5. Register succeeds even if the email can't be sent. Why is that OK here, and when would it not be?

### 2026-11-08 — 4.7 Profile, settings, change password
**What was built:**
- `packages/shared/src/schemas/users.ts`: `updateProfileSchema`, `updateSettingsSchema`, `changePasswordSchema` (all **strict**), `timezoneSchema`, `THEMES`, `PublicSettings`.
- `UsersService` / `UsersController` (`/users/me`): `GET` → `{ user, settings }`, `PATCH` profile, `PATCH /settings`, `POST /change-password` (204). `toPublicSettings` allow-lists the MVP settings.
- `SessionService.revokeAllExcept(userId, familyId)`: change password keeps this device (the `sid` from 4.5) and logs out the others.
- `WrongPasswordError` → 403 `WRONG_PASSWORD`; `AccountGoneError` → 401 for deleted accounts.
- `withoutUndefined()` (`common/utils`); the validation pipe now gives each unknown key its own `{ field, message }`.
- The `createUser` factory creates a settings row, like register does.
- **Deferred:** change email (needs its own "verify the new address" flow, ADR-015), plus export and delete (FR-SET-005/006, later phases).
**Concepts:**
- *Cross-user isolation by construction:* no route takes a user ID (`/users/me`, never `/users/:id`), the ID only comes from the verified token, and every query is filtered by it. There's nothing for an attacker to change. The tests prove it anyway: Tina's edits never touch Juma, a body naming Juma's ID is refused, `/users/<juma-id>` is 404.
- *Strict PATCH, lenient POST:* your 4.2 answer in practice. On PATCH, a dropped typo means "saved" when nothing was saved, so unknown keys are a 400. On POST we still strip, so older app versions sending an extra field keep working.
- *401 vs 403 in a real case:* the app answers 401 with "refresh, then log out". A wrong *current* password is not "who are you?" (the token says), it's "you may not do this", so 403. Using 401 would log the user out for a typo.
- *Server-owned facts:* the client says `onboardingCompleted: true`; the server picks the time and keeps the first one. A client must not be able to choose or backdate it.
- *Validate against the platform:* time zones are checked with `Intl` (the same data the phone uses), stored in canonical spelling (`africa/dar_es_salaam` → `Africa/Dar_es_Salaam`), and fixed offsets like `+03:00` are refused because they ignore daylight saving.
- *Absent vs `undefined`, for real:* Zod types optional fields as `T | undefined`; Prisma (with `exactOptionalPropertyTypes`) wants them absent. `withoutUndefined()` bridges the two. TypeScript can't prove a generic filter, so it has **one** documented lint exception rather than contorted code.
**Checked it can fail (each probe confirmed it changed the code first):** loosening the profile schema to `z.object` → 4 tests fail; revoking *all* sessions on password change → 1 fails; answering a wrong password with 401 → 1 fails.
**Checked:** 95 API unit + 42 shared + 74 e2e. Live production build: settings PATCH canonicalised the time zone, a typo key → 400 with the field named, wrong current password → 403; probe user deleted.
**Phase 5 note:** the mobile app will validate time zones with the same schema. Hermes (React Native's JS engine) must support `Intl.DateTimeFormat` with `timeZone`; check on a device.
**To learn:**
1. Why is there no `GET /users/:id`, and what would you have to check on every request if there were?
2. Why are PATCH bodies strict but POST bodies not?
3. Why does a wrong *current* password return 403 instead of 401?
4. Why does the client send `onboardingCompleted: true` instead of a timestamp?
5. After changing your password, why stay logged in on this device but not on the others?

### 2026-11-08 — 4.8 Rate limits, security headers, CORS, Swagger
**What was built:**
- `@nestjs/throttler` (`src/security/rate-limit.ts`): 100/min by default, `@StrictRateLimit()` 5/min on register, login, verify-email, resend-verification, forgot-password, reset-password, change-password; `@SkipThrottle()` on health. Logged-in requests counted per user, anonymous per IP. 429 `RATE_LIMITED` + `Retry-After`.
- Global guards moved to `AppModule` in an explicit order: `JwtAuthGuard`, then `ThrottlerGuard`.
- `app.setup.ts`: Helmet, CORS (off unless `CORS_ORIGINS`), `trust proxy` = `TRUST_PROXY_HOPS`, Swagger at `/api/v1/docs` (not in production).
- `@ZodBody(schema)`: validation + Swagger body docs from one schema (ADR-012, Proposed). Every controller now uses it.
- Env: `RATE_LIMIT_ENABLED`, `CORS_ORIGINS`, `TRUST_PROXY_HOPS`. `withEnv()` test helper for booting the app with different settings.
**Concepts:**
- *Rate limiting:* caps how often one client can call an endpoint. On login it turns "try a million passwords" into "try 5 a minute"; on forgot-password it stops someone flooding a victim's inbox.
- *What to count by:* per IP is the only option before login, but many mobile users share one IP (carrier-grade NAT), so after login we count per user. That needs the auth guard to have run first: **guard order matters**, and a test proves it (swapping the order fails it).
- *`trust proxy`:* behind Caddy, every request arrives from Caddy's IP; the real one is in `X-Forwarded-For`. Trust exactly the number of proxies you have: zero means everyone shares one bucket; trusting a header blindly lets attackers invent IPs to dodge limits.
- *Security headers (Helmet):* the server tells the client what not to do: don't guess content types (`nosniff`), don't show me in a frame (clickjacking), always use HTTPS (HSTS), only run scripts from here (CSP). Also hides `X-Powered-By: Express`, so we don't advertise what to attack.
- *CORS is for browsers only:* a browser won't let a web page on another site read our responses unless we allow its origin. Native apps aren't affected, so it stays off; never `*`.
- *One source for validation and docs:* `@ZodBody` makes the Swagger docs come from the same schema the pipe enforces, so they can't disagree.
- *Disabled in production:* the API docs are for building and testing, not a public map of the attack surface.
**Found while building:**
- Two type errors from writing APIs from memory (`getInstance<Express>()`, the throttler's tracker type); both fixed by checking the installed types.
- A probe that didn't apply: my "remove the login limit" edit assumed the wrong decorator order. The script checked and reported it instead of reporting a false pass; re-done correctly, the test catches it.
- Swagger UI under Helmet's strict CSP: the page has no inline scripts and all assets load from the same origin, so it works. (My first asset check used the wrong URLs and showed 404s; checking the real paths showed 200s.)
- docs/06 had more detailed limits than NFR-SEC-004. Built to the NFR; the per-email limit and the separate refresh/default numbers are listed as not done.
**Checked:** 96 API unit + 42 shared + 87 e2e: headers present and `X-Powered-By` absent; no CORS by default, only listed origins when set; 150 kB body → 413 `PAYLOAD_TOO_LARGE`; Swagger UI served, login body documented from the Zod schema, strict PATCH shows `additionalProperties: false`, public routes need no token, 404 in production; 6th login → 429 with `Retry-After`; limits are per endpoint; per-user counting (Tina blocked, Juma on the same IP not); 101st general request → 429; health never limited. Probes: swapping guard order, removing the login limit, each fails a test. Live: the full M4 flow (register → login → refresh → edit settings → logout → refresh refused) and a 429 with `Retry-After: 60`; no secrets in logs; probe user deleted.
**M4 status: In review.** The roadmap's acceptance is "register, log in, refresh, log out and edit settings via Swagger", so the last step is yours: open http://localhost:3000/api/v1/docs after restarting the API and click through it.
**To learn:**
1. Why is login limited per IP, but a logged-in user's requests per user?
2. What goes wrong behind Caddy if `trust proxy` is 0? And if the app trusted `X-Forwarded-For` from anyone?
3. Why doesn't the mobile app need CORS, and why should it never be `*`?
4. Why does the order of the two global guards matter?
5. Why is Swagger turned off in production?

### 2026-11-08 — 4.9 Change email
**What was built:**
- Migration `add_email_change`: `EMAIL_CHANGE` link type and `AuthToken.newEmail`. Both additive, so safe to deploy before the code that uses them.
- `EmailVerifiedGuard` (ADR-015) → 403 `EMAIL_NOT_VERIFIED`; route-level `@UseGuards`, after the global guards.
- `EmailChangeService`: `request` (password check, same-address check, taken check, link to the new address, notice to the old) and `confirm` (one transaction: use the link, switch the email, mark it verified, delete outstanding links; then tell the old address).
- `POST /users/me/change-email` and `POST /auth/confirm-email-change`, both 5/min. Shared `changeEmailSchema`, `confirmEmailChangeSchema`. Email templates with a masked address (`t***@example.org`).
**Decisions:**
- Taken new address → `409 EMAIL_TAKEN` (like register; you didn't pick, so I chose the simpler option).
- **Sessions are kept on confirm** (a change from the plan I first gave you): confirming is a link click with no session, so the API can't tell "this device" from others, and logging out everyone gains nothing because the password didn't change. The protections are the password at request time, the notice to the old address, and the confirmation from the new one.
**Concepts:**
- *Prove both ends:* the password proves it's the owner (not just someone holding an unlocked phone); the link proves they control the new inbox. Only then does the email change.
- *Tell the old address:* if it wasn't the owner, the old inbox is the only place they'll hear about it. The notice has no link (nothing to phish with) and masks the new address.
- *Check twice:* "is the new address free?" at request time gives a quick answer; the unique index at confirm time is the real check (someone could register it in between).
- *Old links die with the old address:* a reset link sitting in the old inbox could otherwise reset the account after the move.
- *Additive migrations:* adding an enum value and a nullable column can't break running code. Renaming or dropping would need the expand/contract dance (docs/05).
**Found while building:** my first edit script failed halfway (Prettier had put the providers list on one line), leaving the module unwired while tests still passed. The script stopped on the failed check, so I saw it; the rewrite adds explicit checks for every edit. One test raced the background reset email (the old inbox already had the notice); fixed by clearing the inbox first, then 3/3 green.
**Checked it can fail (each probe confirmed it changed the code):** without the guard, without deleting old links, without translating the duplicate-email error at confirm: each fails a test.
**Checked:** 101 API unit + 44 shared + 99 e2e (12 for change email: unverified 403; link to new + masked notice to old, nothing changed yet; confirm switches, verifies, notifies, works once; sessions kept; old reset link dies; wrong password 403; same address 400; taken 409; taken in between → 409 and nothing changed; only the newest link works; expired / other link types 400; login and strict body required). Live production build through Mailpit: request 204 → confirm 204 → login with the new email 200, the four expected emails, no tokens in logs; probe user deleted.
**To learn:**
1. Why does changing the email need both the password *and* a link sent to the new address?
2. Why does the old address get a notice, and why does that notice contain no link?
3. Why check "is the address free?" at request time if the database checks it again at confirm?
4. Why must outstanding reset links be cancelled when the email changes?

### 2026-11-08 — M4 accepted: the click-through in Swagger
**Done by me in Swagger:** register → Authorize → `PATCH /users/me/settings` (`DARK`, `Africa/Dar_es_Salaam`) → login → refresh → logout → refresh again = `401 INVALID_REFRESH_TOKEN`.
**Confirmed in the database:** the login's first session row is marked rotated (the refresh) and revoked (the logout), the refreshed row is revoked too, and the session from registering is untouched (logout ends one device only).
**Snags on the way, and what they taught:**
- `Cannot GET /api/v1/docs,`: a comma copied along with the URL. Even a mistyped URL came back in the standard `{ error }` shape with a request ID.
- `401 UNAUTHENTICATED` on `/users/me`: the token was pasted **with its JSON quotes** (`Bearer "eyJ…"`). The API expects exactly `Bearer <token>` and refuses anything else instead of guessing.
- Swagger pre-fills bodies with placeholders: `"timezone": "string"` would be a 400. PATCH only needs the fields you're changing.
