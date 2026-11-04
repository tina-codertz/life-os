# 01 — Product Requirements Document (PRD)

| | |
|---|---|
| **Purpose** | Defines *what* we build for MVP and *what we deliberately defer* |
| **Status** | v1.0, approved 2026-11-04 |
| **Last updated** | 2026-11-03 |
| **Related** | [00-Vision](00-PRODUCT-VISION.md) · [02-Functional Requirements](02-FUNCTIONAL-REQUIREMENTS.md) · [08-Roadmap](08-DEVELOPMENT-ROADMAP.md) |

---

## 1. Executive summary

Life OS is a public, self-hosted mobile app (iOS + Android) built with **Expo/React Native** and a **NestJS modular monolith** on **PostgreSQL/Prisma**. The brief describes 10 modules. Building all of them before release would take well over 20 weeks for one developer who is also learning, so this PRD splits delivery into **MVP (v1.0)** and three follow-up releases.

The MVP proves the core loop: **plan the day → act (tasks/habits) → see progress**.

## 2. Release scope

| Module (brief §5) | MVP v1.0 | v1.1 | v1.2 | v2.0 |
|---|:-:|:-:|:-:|:-:|
| A. Dashboard / Today | ✅ core | + finance card | + XP card | + AI card |
| B. Tasks | ✅ (incl. subtasks, simple recurrence) | | | |
| C. Habits | ✅ (daily / weekly / specific days, streaks, reminders) | | | |
| D. Goals | ✅ (milestones, manual + linked progress) | link savings goals | | |
| E. Calendar | ✅ day/week/month views of tasks + events | | | external calendar sync (maybe) |
| F. Finance | ❌ | ✅ | | |
| G. Gamification | ❌ (but domain events emitted from day 1) | | ✅ | |
| H. Statistics | basic counts on Today | finance summaries | | ✅ reports |
| I. AI Assistant | ❌ | | | ✅ opt-in |
| J. Settings | ✅ profile, theme, TZ, notifications, export, delete account | | | |
| Auth + Onboarding | ✅ email/password | | | Sign in with Apple/Google |

**Why defer Finance and Gamification?** Both depend on stable core entities. Gamification rewards task and habit completions, so those flows have to be stable first. Finance is a whole sub-product (aggregations, precision, currencies). Shipping the MVP first gets real feedback sooner.

**Proposed:** Sign in with Apple becomes *mandatory* on iOS once any third-party social login is offered. MVP uses email/password only to avoid that coupling.

## 3. Out of scope (all releases currently planned)

- Collaboration, shared lists, teams.
- Web app (architecture keeps it possible: REST API + shared package).
- Bank account syncing (Plaid etc.). Finance is manual entry.
- Full offline-first sync with conflict resolution. MVP is **online-first with cached reads** (see [04](04-SYSTEM-ARCHITECTURE.md)).
- Microservices.

## 4. MVP user journey (acceptance-level)

1. User opens Life OS → splash → welcome screens.
2. User registers (email + password) → can use the app immediately; a banner asks them to verify their email (Confirmed).
3. Onboarding: name, time zone (auto-detected), theme, 1–3 focus areas, optional first habit.
4. Lands on **Today**: empty states with clear CTAs.
5. Creates a task (≤ 2 taps from Today).
6. Creates a habit with a frequency.
7. Completes the task and checks the habit → Today progress ring updates, habit streak = 1.
8. Next day, opens Today → sees streak, yesterday's summary and today's items.
9. Opens a goal, adds milestones, links tasks → goal progress updates as tasks complete.

## 5. Functional requirement summary

The full list with IDs and acceptance criteria is in [02-FUNCTIONAL-REQUIREMENTS.md](02-FUNCTIONAL-REQUIREMENTS.md). In summary:

- **AUTH**: register, login, logout, refresh session, forgot/reset password, email verification.
- **TODAY**: aggregated daily view, quick actions, progress summary.
- **TASK**: CRUD, priority, category, due date/time, subtasks, simple recurrence, filter/search, completion history.
- **HAB**: CRUD, frequencies, check-in/undo, streaks (current + best), history calendar, reminders, archive.
- **GOAL**: CRUD, target date, category, milestones, progress (manual or derived), complete/archive.
- **CAL**: day/week/month views, events CRUD, recurrence, shows scheduled tasks and habit slots.
- **SET**: profile, theme, time zone, notification preferences, data export, account deletion.

## 6. Non-functional requirement summary

| Area | Requirement |
|---|---|
| Security | OWASP ASVS L1 baseline; argon2id password hashing; JWT short-lived access + rotating refresh tokens; tokens in SecureStore; rate-limited auth endpoints |
| Privacy | Export all user data (JSON); hard-delete account within 30 days; no third-party analytics SDKs in MVP except crash reporting (Sentry, PII scrubbed) |
| Performance | Today screen interactive < 1.5 s on mid-range Android over 4G with warm cache; API p95 < 300 ms |
| Accessibility | WCAG 2.2 AA contrast; screen-reader labels; dynamic type up to 200%; 44×44 pt touch targets |
| Reliability | Daily DB backups, tested restore; 99.5% monthly uptime target (single VPS) |
| Time | All timestamps stored UTC; "day" logic evaluated in the user's IANA time zone |
| Maintainability | Strict TypeScript; lint + tests in CI; each module documented |
| Store compliance | In-app account deletion (Apple/Google requirement); privacy policy URL |

## 7. Assumptions

- A1. One developer, **10–15 hours/week** (Confirmed 2026-11-04), learning while building.
- A2. Single currency per user in v1.1, chosen in settings (TZS default for the developer). Multi-currency per transaction is deferred.
- A3. English only in MVP. Strings are externalized so i18n can come later.
- A4. Push notifications via Expo Notifications. Habit reminders scheduled **locally** on device in MVP (no server push needed).
- A5. Self-hosted on a single VPS with Docker Compose (Confirmed, ADR-008).

## 8. Key risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope creep (10 modules) | Never ships | Strict MVP; each module done end-to-end before the next |
| Habit/streak time-zone bugs | User trust | Local-date model, exhaustive unit tests (see [05](05-DATABASE-DESIGN.md), [09](09-TESTING-STRATEGY.md)) |
| Self-hosting ops burden | Downtime, data loss | Automated backups + restore drills, uptime monitoring, documented runbook |
| Learning curve slows delivery | Timeline slips | Roadmap sized at ~24 weeks with buffer weeks |
| App Store review rejection | Launch delay | Account deletion, privacy policy, no placeholder content |

## 9. Resolved questions (2026-11-04)

1. Weekly time: **10–15 h/week** → MVP ≈ 30 calendar weeks (see [08 §1](08-DEVELOPMENT-ROADMAP.md#1-timeline-realism)).
2. Branding: name stays **Life OS**; logo to be decided before Phase 11.
3. Email verification: users can **use the app immediately** with a reminder banner; verification is required only for sensitive actions (data export, email change).
