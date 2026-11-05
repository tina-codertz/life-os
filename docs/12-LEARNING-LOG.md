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
