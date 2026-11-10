# 02 — Functional & Non-Functional Requirements

| | |
|---|---|
| **Purpose** | Testable requirements per module, with IDs referenced by the roadmap, API and tests |
| **Status** | Draft v0.1, awaiting review |
| **Last updated** | 2026-11-03 |
| **Related** | [01-PRD](01-PRD.md) · [05-Database](05-DATABASE-DESIGN.md) · [06-API](06-API-SPECIFICATION.md) · [09-Testing](09-TESTING-STRATEGY.md) |

**ID format:** `FR-<MODULE>-<NNN>`. **Release tags:** `MVP`, `v1.1`, `v1.2`, `v2`.
Each user story follows: *As a user, I want … so that …*, followed by acceptance criteria (AC) written so they can become tests.

---

## AUTH — Authentication & Account (MVP)

| ID | Requirement | Release |
|---|---|---|
| FR-AUTH-001 | Register with email, password, display name | MVP |
| FR-AUTH-002 | Log in with email + password | MVP |
| FR-AUTH-003 | Stay logged in across app restarts (refresh token) | MVP |
| FR-AUTH-004 | Log out (revokes the refresh token on this device) | MVP |
| FR-AUTH-005 | Forgot / reset password via emailed one-time link | MVP |
| FR-AUTH-006 | Verify email address | MVP |
| FR-AUTH-007 | Log out of all devices | MVP |
| FR-AUTH-008 | Sign in with Apple / Google | v2 |

**Story:** As a new user, I want to create an account so that my data is saved and available on any device.
**AC:**
- Email must be valid and unique (case-insensitive); duplicate returns `409 EMAIL_TAKEN`.
- Password ≥ 10 chars; checked against a common-password list.
- On success the user is logged in and routed to onboarding.
- Five failed logins within 15 min for the same email/IP → throttled (`429`).
- Error messages never reveal whether an email exists (login and forgot-password).

---

## ONB — Onboarding (MVP)

| ID | Requirement |
|---|---|
| FR-ONB-001 | Collect display name, time zone (auto-detected, editable). *(Theme moved to Settings → Appearance on 2026-11-08, following the design; FR-SET-002)* |
| FR-ONB-002 | Choose 1–3 focus areas (e.g. Health, Work, Learning, Money) → seeds default task categories |
| FR-ONB-003 | Optionally create a first habit from templates |
| FR-ONB-004 | Onboarding can be skipped. `onboardingCompletedAt` is stored server-side |

---

## TODAY — Dashboard (MVP)

| ID | Requirement |
|---|---|
| FR-TODAY-001 | Show tasks due today (user's local date) + overdue tasks, sorted by priority then time |
| FR-TODAY-002 | Show habits scheduled for today with check state |
| FR-TODAY-003 | Show the next 3 upcoming events today/tomorrow |
| FR-TODAY-004 | Show daily progress ring = (completed tasks + completed habits) / (scheduled tasks + scheduled habits) |
| FR-TODAY-005 | Up to 3 "Top priorities" (pinned tasks for today) |
| FR-TODAY-006 | Quick actions: add task, add habit, add event |
| FR-TODAY-007 | Greeting + date in user's time zone |
| FR-TODAY-008 | Single aggregated API call (`GET /today`) to keep the screen fast |

**AC:** Completing a task or habit from Today updates the ring optimistically. If the server rejects the change, the UI rolls back and shows a toast.

---

## TASK — Task Management (MVP)

| ID | Requirement |
|---|---|
| FR-TASK-001 | Create task: title (required, ≤ 200), description (≤ 5,000), priority (none/low/medium/high/urgent), category, due date, optional due time |
| FR-TASK-002 | Edit and delete (soft delete, restorable for 30 days) |
| FR-TASK-003 | Mark complete / incomplete. `completedAt` recorded |
| FR-TASK-004 | Categories: user-defined, name + color + icon, unique name per user |
| FR-TASK-005 | Subtasks: one level deep, own completion state. Parent completion does not auto-complete children (prompted instead) |
| FR-TASK-006 | Recurrence: daily, weekly (selected weekdays), monthly (day of month), every N days. Completing an occurrence generates the next one |
| FR-TASK-007 | Filter by status, priority, category, due range; search by title/description |
| FR-TASK-008 | History view: completed tasks grouped by day |
| FR-TASK-009 | Link a task to a goal (optional) |
| FR-TASK-010 | Cursor-paginated list (default 30) |

**Story:** As a user, I want recurring tasks so that I don't have to re-create weekly chores.
**AC:**
- Completing "Pay rent, monthly on day 1" creates the next instance dated the 1st of next month.
- For day 31 in a 30-day month, the occurrence falls on the last day of that month.
- Editing the recurrence affects future occurrences only.

---

## HAB — Habit Tracking (MVP)

| ID | Requirement |
|---|---|
| FR-HAB-001 | Create habit: name, icon, color, frequency type: `DAILY`, `WEEKLY_DAYS` (e.g. Mon/Wed/Fri), `TIMES_PER_WEEK` (e.g. 3×/week) |
| FR-HAB-002 | Check in / undo for today. Backfill allowed for the past 7 days only |
| FR-HAB-003 | Current streak and best streak, computed **server-side** |
| FR-HAB-004 | History heatmap/calendar (last 12 weeks default) |
| FR-HAB-005 | Missed days shown distinctly from "not scheduled" days |
| FR-HAB-006 | Reminder time(s), scheduled as local notifications on device |
| FR-HAB-007 | Archive habit (keeps history) and delete (soft) |
| FR-HAB-008 | Stats: completion rate 7/30/90 days, total completions |
| FR-HAB-009 | Optional quantitative target (e.g. 8 glasses). Completion when count ≥ target |

### Habit edge-case rules (must be covered by unit tests)
1. **Day boundary** = midnight in the user's *current* time zone. Completions are stored with `localDate` (DATE) computed at check-in time, plus `completedAt` (UTC).
2. **Time-zone change:** past `localDate`s are never recomputed. History stays as the user experienced it.
3. **DST:** irrelevant to the date-based model. Tests cover the spring-forward and fall-back days.
4. **Streak for `DAILY`:** consecutive scheduled days with a completion. Today not yet completed does **not** break the streak until the day ends.
5. **Streak for `WEEKLY_DAYS`:** non-scheduled days are skipped (neither break nor extend).
6. **Streak for `TIMES_PER_WEEK`:** streak counted in *weeks* meeting the target (week start from user preference, Monday default). A week cut short by the start date or a schedule change (fewer than 7 of its days under this rule) is never missed: it counts if it reached the target, otherwise it's skipped. A target changed mid-week applies to the running week.
7. **Frequency change:** applies from the change date forward. Previous periods are evaluated with the old rule (stored via `HabitSchedule` versions, see [05](05-DATABASE-DESIGN.md)).
8. **Created mid-period:** days before `startDate` are never "missed".
9. **Duplicate check-in** for the same `localDate` is idempotent (unique constraint).

---

## GOAL — Goals (MVP)

| ID | Requirement |
|---|---|
| FR-GOAL-001 | Create goal: title, description, category, target date (optional), status (active/completed/abandoned) |
| FR-GOAL-002 | Milestones: ordered list, title, optional due date, done flag |
| FR-GOAL-003 | Progress mode: `MILESTONES` (done/total), `TASKS` (linked tasks completed/total), or `MANUAL` (0–100) |
| FR-GOAL-004 | Link/unlink tasks and habits to a goal |
| FR-GOAL-005 | Mark goal complete. Completion date recorded |
| FR-GOAL-006 | Goal list grouped by status, sorted by target date |
| FR-GOAL-007 | Link a savings goal (v1.1) |

---

## CAL — Calendar & Scheduling (MVP)

| ID | Requirement |
|---|---|
| FR-CAL-001 | Day, week and month views |
| FR-CAL-002 | Events CRUD: title, start, end, all-day flag, location, notes, color |
| FR-CAL-003 | Event recurrence (RRULE subset: daily/weekly/monthly, until/count) |
| FR-CAL-004 | Tasks with a due date appear on the calendar. Tasks with a due time appear as timed items. *(2026-11-10, your choice: a task can have an optional length, 5 min–12 h, for its block; without one it shows as 30 minutes.)* |
| FR-CAL-005 | Habits appear on the days they're due. *(Changed 2026-11-10, your choice for the design's "Habit block": a habit with a reminder shows as a block at that time; one without sits in the day's "All day" row.)* |
| FR-CAL-006 | Event reminders (local notification, N minutes before) |
| FR-CAL-007 | External calendar sync (Google/Apple) |

FR-CAL-007 is **v2, maybe**.

**Interaction model (Proposed):** Calendar is a *read model* combining Events, Tasks and Habits. Only Events are owned by the calendar module. Dragging a task on the calendar edits the task's `dueAt`.

---

## FIN — Finance (v1.1)

| ID | Requirement |
|---|---|
| FR-FIN-001 | Accounts (Cash, Bank, Mobile money) with opening balance |
| FR-FIN-002 | Transactions: type (income/expense/transfer), amount, currency, category, date, note |
| FR-FIN-003 | Financial categories (income vs expense), defaults seeded |
| FR-FIN-004 | Monthly budgets per category with spent vs limit |
| FR-FIN-005 | Budget alerts at 80% and 100% (in-app; push later) |
| FR-FIN-006 | Savings goals: target amount, target date, contributions |
| FR-FIN-007 | Summaries: month income, expense, net, top categories |
| FR-FIN-008 | Spending trend (last 6 months) |
| FR-FIN-009 | Money stored as integer minor units, **never floats** (see ADR-005) |

---

## GAME — Gamification (v1.2)

| ID | Requirement |
|---|---|
| FR-GAME-001 | XP awarded server-side for: task completion (by priority), habit check-in, milestone done, goal completed |
| FR-GAME-002 | XP is an append-only ledger. Undo creates a reversing entry |
| FR-GAME-003 | Levels derived from total XP (formula in config, not hard-coded in the client) |
| FR-GAME-004 | Daily activity streak (any qualifying action) |
| FR-GAME-005 | Achievements (e.g. "7-day streak", "100 tasks"), evaluated by the backend on domain events |
| FR-GAME-006 | Weekly challenges with progress |
| FR-GAME-007 | Anti-abuse: XP for tasks capped per day, and no XP for tasks completed < 60 s after creation |

---

## STAT — Statistics (basic MVP, full v2)

| ID | Requirement | Release |
|---|---|---|
| FR-STAT-001 | Today summary counts | MVP |
| FR-STAT-002 | Weekly/monthly report: tasks completed, completion rate, habit consistency, goal progress | v2 |
| FR-STAT-003 | Trends charts (tasks/day, habit %, spending) | v2 |

---

## AI — Assistant (v2, opt-in)

| ID | Requirement |
|---|---|
| FR-AI-001 | Weekly summary generated from the user's own aggregated stats |
| FR-AI-002 | Daily plan suggestion (proposed list, user accepts/edits) |
| FR-AI-003 | Natural-language capture ("remind me to call mum Friday 5pm") → **draft** task shown for confirmation |
| FR-AI-004 | AI never writes records directly: all writes go through normal validated endpoints after explicit user approval |
| FR-AI-005 | Opt-in toggle. Data sent to the provider is minimized and disclosed |

---

## SET — Settings (MVP)

| ID | Requirement |
|---|---|
| FR-SET-001 | Edit profile (name, avatar later), change email, change password |
| FR-SET-002 | Theme: light / dark / system, in Settings → Appearance (the design's Settings screen); saved to the server and applied at once |
| FR-SET-003 | Time zone (auto-follow device or fixed) and week start day |
| FR-SET-004 | Notification preferences (habit reminders on/off, event reminders default) |
| FR-SET-005 | Export all my data as JSON (async job, emailed link or in-app download) |
| FR-SET-006 | Delete account: confirm with password, soft-delete then purge within 30 days |
| FR-SET-007 | Privacy: crash-report opt-out, AI opt-in (v2) |

**Change email (FR-SET-001) AC** (built in 4.9):
- Only with a verified current email (`403 EMAIL_NOT_VERIFIED`, ADR-015) and the current password (`403 WRONG_PASSWORD`).
- The new address gets a confirmation link (1 hour, single use, only the newest works); the old address gets a notice (masked new address, no link). Nothing changes until the link is used.
- On confirm: email switched and marked verified; outstanding reset/verification links (sent to the old address) stop working; the old address is told. Sessions stay (the password didn't change).
- The new address must be free at request and at confirm time (`409 EMAIL_TAKEN`). Same address in another letter case → 400.

---

## Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-SEC-001 | Security | Passwords hashed with argon2id |
| NFR-SEC-002 | Security | Access token TTL 15 min, refresh token 30 days, rotated on use, reuse detection revokes the family |
| NFR-SEC-003 | Security | Every query scoped by `userId` from the token, never from the request body (prevents IDOR) |
| NFR-SEC-004 | Security | Rate limiting: auth 5/min/IP, general 100/min/user |
| NFR-SEC-005 | Security | HTTPS only (Caddy auto-TLS), HSTS, Helmet headers |
| NFR-SEC-006 | Security | Secrets via env vars, never committed. `.env.example` documents the keys |
| NFR-PERF-001 | Performance | API p95 < 300 ms for reads, < 500 ms for writes at 50 rps on the VPS |
| NFR-PERF-002 | Performance | Lists paginated. No unbounded queries |
| NFR-PERF-003 | Performance | Mobile JS bundle start-up < 2 s on a mid-range Android device |
| NFR-A11Y-001 | Accessibility | WCAG 2.2 AA contrast for text, both themes |
| NFR-A11Y-002 | Accessibility | All interactive elements have `accessibilityLabel`/`role` |
| NFR-A11Y-003 | Accessibility | Supports OS font scaling, and respects Reduce Motion |
| NFR-PRIV-001 | Privacy | Data export and account deletion (store requirement) |
| NFR-PRIV-002 | Privacy | PII never written to logs |
| NFR-REL-001 | Reliability | Daily encrypted off-site DB backup; restore tested monthly |
| NFR-REL-002 | Reliability | Graceful degraded mode: cached data readable offline, writes show a clear error |
| NFR-TIME-001 | Time | UTC storage; local-date fields for day-based logic; IANA TZ on the user |
| NFR-MAINT-001 | Maintainability | TypeScript `strict`, ESLint, Prettier, CI must pass before merge |
| NFR-MAINT-002 | Maintainability | Service-layer business logic unit-tested (≥ 80% lines in `*.service.ts`) |
| NFR-OBS-001 | Observability | Structured JSON logs with request ID; Sentry on API and mobile |
