# 06 — API Specification

| | |
|---|---|
| **Purpose** | REST conventions and the endpoint contract between mobile and API |
| **Status** | Draft v0.1 (Proposed). Swagger becomes the generated source of truth once implemented |
| **Last updated** | 2026-11-03 |
| **Related** | [04-Architecture](04-SYSTEM-ARCHITECTURE.md) · [05-Database](05-DATABASE-DESIGN.md) · [02-Requirements](02-FUNCTIONAL-REQUIREMENTS.md) |

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base URL | `https://api.<domain>/api/v1` (local: `http://localhost:3000/api/v1`) |
| Format | JSON, `camelCase` keys, UTF-8 |
| Resources | Plural nouns: `/tasks`, `/habits/:id/completions` |
| Methods | `GET` read · `POST` create/action · `PATCH` partial update · `PUT` replace a set (e.g. linked tasks) · `DELETE` remove |
| Auth | `Authorization: Bearer <accessToken>` on everything except `/auth/*` (public) and `/health` |
| IDs | UUID strings |
| Dates | `YYYY-MM-DD` for local dates (`dueDate`, `localDate`); ISO-8601 UTC with `Z` for instants (`completedAt`) |
| Money (v1.1) | `amountMinor` as **string** (`"150000"`) + `currency` |
| Time zone | Server uses `UserSettings.timezone`. Client may send `X-Timezone` to keep it in sync when `followDeviceTimezone` is on |
| Versioning | URI version `/v1`. Additive changes are non-breaking. Breaking changes mean `/v2` and running both until old app versions age out |
| Request ID | Server returns `X-Request-Id`. Clients may send one |
| Idempotency | `POST` actions that may be retried (completions) are idempotent by design. `Idempotency-Key` header reserved for v1.1 transactions |

### Response envelope
```jsonc
// Single resource
{ "data": { "id": "…", "title": "…" } }

// Collection (cursor pagination)
{ "data": [ … ], "meta": { "nextCursor": "01HF…", "hasMore": true } }

// Error
{ "error": { "code": "TASK_NOT_FOUND", "message": "Task not found.", "details": [], "requestId": "…" } }
```
Built in 4.1: `ResponseEnvelopeInterceptor` wraps whatever a controller returns in `{ data }`. List endpoints return `new Page(items, meta)` to get `{ data, meta }`. `undefined` (204) and file downloads are not wrapped. Types: `ApiDataBody`, `ApiPageBody`, `PageMeta` in `packages/shared`. No exceptions, including `/health` (monitors check only the status code).

### Pagination, filtering, sorting
- `?limit=30&cursor=<opaque>`. Max limit is 100. Schema: `paginationQuerySchema` in `packages/shared`.
- Filters are explicit query params (`?status=TODO&priority=HIGH&categoryId=…&dueFrom=2026-11-01&dueTo=2026-11-07&q=rent`).
- `?sort=dueDate` / `?sort=-createdAt` (whitelisted fields only).

### Status codes
| Code | When |
|---|---|
| 200 | OK (read/update) |
| 201 | Created |
| 204 | Deleted / no content |
| 400 | `VALIDATION_FAILED`: malformed or invalid input |
| 401 | `UNAUTHENTICATED`: missing/expired token (with `WWW-Authenticate: Bearer`); `INVALID_CREDENTIALS` for a failed login; `INVALID_REFRESH_TOKEN` for a refresh token that's unknown, expired, revoked or reused |
| 403 | `FORBIDDEN`: authenticated but action not allowed (e.g. unverified email for export); `WRONG_PASSWORD` when confirming with the current password fails |
| 404 | `*_NOT_FOUND`: also returned for other users' resources |
| 409 | `CONFLICT` / `EMAIL_TAKEN` |
| 422 | `BUSINESS_RULE_VIOLATION`: valid shape, invalid by rule (e.g. backfill > 7 days, subtask of subtask) |
| 413 | `PAYLOAD_TOO_LARGE`: request body over the size limit (100 kB, Express's default) |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR`: generic message only; details go to the logs |
| 503 | `SERVICE_UNAVAILABLE`: a dependency (e.g. the database) is down |

The common codes live in `packages/shared` (`COMMON_ERROR_CODES`, `ApiErrorBody`). Built in 4.1: `AllExceptionsFilter` (`apps/api/src/common/filters`) maps every thrown value to this table; features throw `AppException(status, code, message, { details, cause })`.

### Validation
Built in 4.2. Request bodies, query strings and route params are validated with **Zod schemas from `packages/shared`**, the same schemas the mobile forms use, so client and server can't disagree about what's valid.
```ts
create(@Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput) { … }
```
- The controller receives the parsed value: query strings coerced to numbers/booleans, defaults applied, **unknown keys dropped** (a client can't sneak in `userId`).
- Invalid input → 400 `VALIDATION_FAILED`, one detail per problem. `field` is the dotted path; a problem with the whole value (no body) has no `field`. Messages describe the rule, never the rejected value.
```jsonc
{ "error": { "code": "VALIDATION_FAILED", "message": "Some fields are invalid.",
  "details": [ { "field": "title", "message": "Too small: expected string to have >=1 characters" },
               { "field": "done", "message": "Invalid input: expected boolean, received string" } ],
  "requestId": "…" } }
```
- **PATCH bodies are strict** (`z.strictObject`): an unknown key is a 400 with `{ field: "<key>", message: "This field is not allowed." }`, so a typo can't "save" nothing and fields like `userId` are refused. Create bodies (POST) still drop unknown keys, so older app versions keep working.
- Shape only. Rules that need the database or the user's state (email already taken, backfill > 7 days) are checked in the service and return 409/422.

## 2. Endpoints: MVP

### Health
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ data: { status: "ok", db: "ok" } }`, public. DB down → 503 `SERVICE_UNAVAILABLE` (error envelope) |

### Auth (`/auth`, public, rate-limited)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, displayName, deviceName? }` | `201 { user, accessToken, refreshToken }` |
| POST | `/auth/login` | `{ email, password, deviceName? }` | `200 { user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` | `200 { accessToken, refreshToken }` (rotated) |
| POST | `/auth/logout` | `{ refreshToken }` | `204` |
| POST | `/auth/logout-all` | (auth) | `204` |
| POST | `/auth/verify-email` | `{ token }` | `204` |
| POST | `/auth/resend-verification` | (auth) | `204` |
| POST | `/auth/forgot-password` | `{ email }` | `204` (always, even for unknown emails) |
| POST | `/auth/reset-password` | `{ token, newPassword }` | `204`, revokes all sessions |
| POST | `/auth/confirm-email-change` | `{ token }` | `204` (4.9). Switches the email, marks it verified, cancels outstanding links, tells the old address. `400 INVALID_LINK`; `409 EMAIL_TAKEN` if the address was taken meanwhile. Public, 5 / min |

Built in 4.6 (emailed one-time links):
- Register emails a verification link (`EMAIL_LINK_BASE_URL` + `verify-email?token=…`, default `lifeos://`). If sending fails, register still succeeds and the error is logged; the user can resend.
- **verify-email** (public): `204`; an unknown, expired, used or superseded token → `400 INVALID_LINK`. **resend-verification** (access token): `204`, sends nothing if already verified. Only the newest link of each kind works.
- **forgot-password** (public): always `204`, same speed for known and unknown emails (the token and email are created in the background). The reset link expires in **1 hour**; verification links in **48 hours**.
- **reset-password** (public): `newPassword` follows the register rules (a 400 doesn't use up the link). On success: new password, every session revoked, and the email marked verified (the link proves ownership). A verification link can't be used as a reset link.
- Rate limited to 5 / min (4.8).

Built (4.4–4.5): register `201` and login `200` return `{ user, accessToken, refreshToken }` (`AuthResult`); both accept an optional `deviceName`. Refresh returns `{ accessToken, refreshToken }` (`TokenPair`).
- **Refresh:** each refresh token works **once**. Presenting an already-used one (replay, or two parallel refreshes) → `401 INVALID_REFRESH_TOKEN` and every token of that login is revoked. Unknown, expired, revoked, or deleted account → the same 401. The app must refresh single-flight (docs/04).
- **Logout** (public, so it works with an expired access token): ends the token's login, `204` even for an unknown token. **Logout-all** (access token required): ends every login of the user, `204`.
- Access tokens stay valid until they expire (≤ 15 min) after logout; only refresh tokens are revoked immediately.
- Access token: JWT, HS256 with `JWT_ACCESS_SECRET`, 15 min. Claims `sub` (user ID), `iss: life-os-api`, `aud: life-os-app`, `iat`, `exp`; `sid` joins in 4.5. Verification accepts HS256 only.
- Login failure, whether the email is unknown, the password is wrong or the account is deleted → the same `401 INVALID_CREDENTIALS` "Email or password is incorrect.", with the same timing (an unknown email still runs one argon2 verify).
- `loginSchema` doesn't apply the new-password rules (an old password must keep working).
- Body schema `registerSchema` (`packages/shared`): email trimmed + lowercased; password 10–128 characters and not one of the 1,000 most-used long passwords; `displayName` 1–80 after trimming. Unknown fields (`role`, `emailVerifiedAt`) are dropped.
- `user` is a `PublicUser`: `{ id, email, displayName, emailVerifiedAt, onboardingCompletedAt, createdAt }`, built field by field, never including the hash.
- Duplicate email (any case, including two simultaneous sign-ups) → `409 EMAIL_TAKEN`. Register necessarily reveals that an email has an account; login and forgot-password must not (FR-AUTH-001), and the 4.8 rate limit makes probing slow.

### Users & settings (`/users/me`)
| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | `{ user, settings }`. `401` if the account no longer exists |
| PATCH | `/users/me` | `{ displayName?, onboardingCompleted?: true }` → `PublicUser`. The server sets `onboardingCompletedAt` (first time only); a client can't backdate it |
| PATCH | `/users/me/settings` | `{ timezone?, followDeviceTimezone?, weekStartsOn? (0–6), theme?, habitRemindersOn?, eventReminderDefault? (minutes, null = off), crashReportsOn? }` → `PublicSettings`. `timezone` must be an IANA name (stored in canonical spelling; `+03:00` refused) |
| POST | `/users/me/change-password` | `{ currentPassword, newPassword }` → `204`. Logs out every *other* device. Wrong current password → `403 WRONG_PASSWORD` (not 401, which the app treats as "log out") |
| POST | `/users/me/change-email` | `{ newEmail, password }` → `204` (4.9). Verified email required (`403 EMAIL_NOT_VERIFIED`); wrong password `403 WRONG_PASSWORD`; taken `409 EMAIL_TAKEN`; same address → 400 on `newEmail`. Emails a link to the new address and a notice to the old; nothing changes yet. 5 / min |
| POST | `/users/me/export` | `202 { jobId }` → `GET /users/me/export/:jobId` returns status + download URL |
| DELETE | `/users/me` | `{ password }` → `204`, soft-deletes and revokes sessions |

Built in 4.7: GET/PATCH `/users/me`, PATCH settings, change-password; 4.9: change email. Not yet: export (FR-SET-005), delete (FR-SET-006). There are deliberately **no `/users/:id` routes**: the user is always the one in the token.

### Today
| Method | Path | Notes |
|---|---|---|
| GET | `/today?date=YYYY-MM-DD` | `date` defaults to the user's local today |

```jsonc
// 200
{ "data": {
  "date": "2026-11-03",
  "priorities": [ /* Task, max 3 */ ],
  "tasks":      { "overdue": [ … ], "dueToday": [ … ] },
  "habits":     [ { "habit": { … }, "scheduledToday": true, "completion": { "count": 1 } | null } ],
  "events":     [ /* next 3 */ ],
  "progress":   { "completed": 4, "total": 7, "percent": 57 }
} }
```

### Categories
| Method | Path |
|---|---|
| GET | `/categories` |
| POST | `/categories` — `{ name, color, icon? }` |
| PATCH | `/categories/:id` |
| DELETE | `/categories/:id`. Tasks keep existing with `categoryId = null` |

Built in 6.1 Part 1: `GET` (ordered by `sortOrder`, then name), `POST` (`201`), `PATCH /:id` (`{ name?, color?, icon?, sortOrder? }`, strict), `DELETE /:id` (`204`). `color` is a **palette name** (`CATEGORY_COLORS`: violet, blue, teal, green, amber, orange, red, pink, gray), not hex, so each has a tuned dark/light value. Names are unique per user **regardless of case** → `409 CATEGORY_NAME_TAKEN` (on `name`). Max 50 per user → `422 CATEGORY_LIMIT_REACHED`. Another user's category, or a malformed ID → `404 CATEGORY_NOT_FOUND` (same answer, so the format reveals nothing).

### Tasks
| Method | Path | Notes |
|---|---|---|
| GET | `/tasks` | filters: `status, priority, categoryId, goalId, dueFrom, dueTo, q, parentId=null` (top-level only, default) |
| POST | `/tasks` | see body below |
| GET | `/tasks/:id` | includes `subtasks[]` |
| POST | `/tasks/:id/subtasks` | `{ title }` → `201` the subtask (Tasks II Part 2) |
| PATCH | `/tasks/:id` | partial |
| DELETE | `/tasks/:id` | soft delete → `204` |
| POST | `/tasks/:id/restore` | undo delete (≤ 30 days) |
| POST | `/tasks/:id/complete` | `200 { task, nextOccurrence? }` |
| POST | `/tasks/:id/uncomplete` | `200 { task }` |
| GET | `/tasks/history?from&to[&include=tasks]` | completed tasks grouped by local completion date (built in Tasks II Part 4) |

**Built in 6.1 Part 2:** list, create, get, patch, delete, restore, complete, uncomplete (history, subtasks and recurrence are Tasks II).

**Built in Tasks II Part 2 (subtasks, FR-TASK-005):** a subtask is a task with `parentId`, **one level deep**: adding a subtask to a subtask → `422 SUBTASK_NOT_ALLOWED`; at most `MAX_SUBTASKS` (50) per task → `422 SUBTASK_LIMIT_REACHED`. `POST /tasks/:id/subtasks { title }` adds one at the end. `GET /tasks/:id` returns `subtasks[]` (oldest first). **Every task now carries `parentId`, `subtaskCount` and `subtasksDone`** (the list's "2 of 4", counted in one grouped query per page). **Lists and search return top-level tasks only.** A subtask is edited, completed and deleted (soft) with the normal task endpoints, and a deleted one drops out of its task and the counts. **`POST /tasks/:id/complete` takes an optional body `{ includeSubtasks: true }`**, which also completes the task's open subtasks (in one transaction); without it, subtasks are left as they are (the app asks first). No body is the same as `{}`, and unknown keys → 400.

**Built in Tasks II Part 3 (repeat, FR-TASK-006):** `recurrenceRule` on create / PATCH / every task. It's a strict RRULE subset (shared `recurrence.ts`): `FREQ=DAILY`, `FREQ=DAILY;INTERVAL=n` (2–365), `FREQ=WEEKLY;BYDAY=MO,WE,…`, `FREQ=MONTHLY;BYMONTHDAY=d` (1–31). Anything else → 400 on `recurrenceRule`. Rules are stored in one spelling (weekdays in week order). A repeat **needs a date** (400 "A repeating task needs a date."), and clearing `dueDate` clears it, like `dueTime`. **`POST /complete` now answers `{ task, nextOccurrence }`**: completing a repeating task creates the next one in the same transaction, copying title, notes, priority, category, time, rule and its subtasks as a fresh checklist. Its date is the occurrence after the due date, or **today or later** if the task was completed late (no pile of overdue copies), with "today" in the user's time zone. Day 31 falls on the last day of shorter months. `nextOccurrence` is null if the task doesn't repeat or a later one already exists, so complete → uncomplete → complete makes no duplicate.

**Built in Tasks II Part 4 (history):** `GET /tasks/history?from=YYYY-MM-DD&to=YYYY-MM-DD` → `{ from, to, total, days: [{ date, count }] }`. It counts completed **top-level** tasks per **local day in the user's time zone** (a task done at 01:30 in Dar es Salaam counts on that day, not the UTC one). Days with nothing are left out, and days are oldest first. `&include=tasks` adds each day's `tasks[]` (newest first). Limits: up to 366 days, and up to 42 days with tasks. Otherwise it's a 400 on `to` / `include`; `from` after `to` is a 400 on `to`. Deleted, open and other users' tasks never count.
- **List:** newest first; `?limit` (default 30, max 100) & opaque `?cursor` (UUIDv7 IDs sort by creation time, so `id < cursor` pages without gaps or repeats); filters `status`, `priority`, `categoryId`, `dueFrom`/`dueTo` (inclusive), `q` (title or description, any case). Deleted tasks never appear. A bad cursor → 400 on `cursor`.
- **Dates:** `dueDate` is a calendar day `"YYYY-MM-DD"` in the user's zone (impossible days refused); `dueTime` is minutes after local midnight and needs a date. Clearing `dueDate` clears `dueTime`.
- **Category:** must be one of *your* categories, else `400` on `categoryId` ("Choose one of your categories."). The foreign key alone would accept anyone's.
- **PATCH is strict** (status changes go through `/complete` / `/uncomplete`). **Complete** keeps the first `completedAt` when repeated; **uncomplete** clears it. Responses `{ task }`.
- **Delete** is soft (`204`); **restore** works for 30 days, then `404 TASK_NOT_FOUND`; deleted tasks can't be edited or completed. Another user's task or a malformed ID → `404 TASK_NOT_FOUND`.

```jsonc
// POST /tasks
{
  "title": "Pay rent",
  "description": null,
  "priority": "HIGH",            // NONE|LOW|MEDIUM|HIGH|URGENT
  "categoryId": "…",
  "goalId": null,
  "parentId": null,
  "dueDate": "2026-12-01",
  "dueTime": 540,                // 09:00 local, optional
  "recurrenceRule": "FREQ=MONTHLY;BYMONTHDAY=1"
}
```

### Habits
| Method | Path | Notes |
|---|---|---|
| GET | `/habits?archived=false` | includes `currentStreak`, `bestStreak`, `todayCompletion` |
| POST | `/habits` | `{ name, icon?, color, targetCount?, unit?, reminderTimes?, startDate?, schedule: { frequency, weekdays?, timesPerWeek? } }` |
| GET | `/habits/:id` | includes current schedule |
| PATCH | `/habits/:id` | changing `schedule` creates a new `HabitSchedule` effective today |
| POST | `/habits/:id/archive` · `/unarchive` | |
| DELETE | `/habits/:id` | soft delete |
| GET | `/habits/:id/completions?from&to` | for the heatmap; each day labelled `done`/`missed`/`unscheduled`/`future` |
| POST | `/habits/:id/completions` | `{ localDate, count? }` → `201 { completion, streak: { current, best } }`. Idempotent per date. `422` if > 7 days back or in the future |
| DELETE | `/habits/:id/completions/:localDate` | undo → `200 { streak }` |
| GET | `/habits/:id/stats` | `{ rate7, rate30, rate90, total }` |

**Built in Habits I Part 1 (2026-11-08):**
- `GET /habits[?archived=true]`, `POST /habits`, `GET / PATCH / DELETE /habits/:id`, `POST /habits/:id/archive` · `/unarchive`, `POST /habits/:id/completions`, `DELETE /habits/:id/completions/:localDate`.
- Each habit carries its **schedule in force today**, `dueToday`, and `today` (today's check-in or null), with "today" in the user's zone.
- `color` is a palette name like categories. `schedule` is `{ frequency: 'DAILY' }`, `{ frequency: 'WEEKLY_DAYS', weekdays: [0–6, Sunday = 0] }` or `{ frequency: 'TIMES_PER_WEEK', timesPerWeek: 1–7 }`. A schedule change is a new `HabitSchedule` from today; two changes on one day replace each other.
- **Check-in** is `{ localDate, count? }` → `201` the completion. It's **safe to repeat**: one per day (unique index), and a repeat sets the count. With no count it's the full `targetCount` (one tap means done).
- `422 CHECK_IN_OUT_OF_RANGE` for the future, more than 7 days back, before `startDate`, or an archived habit. Undo has the same range and is `204` even if there was nothing to undo.
- Max 50 habits → `422 HABIT_LIMIT_REACHED`. Another user's habit or a malformed id → `404 HABIT_NOT_FOUND`.
- **Brought forward for the quest path (Habits I step 2a):**
  - Every habit carries `streak: { current, best, unit }` (unit is `weeks` for N-times-a-week), worked out by the **shared streak engine** (`packages/shared/src/habits/streaks.ts`).
  - Check-in answers `201 { completion, streak }`; undo answers `200 { completion: null, streak }`.
  - `GET /habits/:id/days?from&to` (up to 93 days) gives each day's `state`: `done`, `missed`, `open` (an unused day of an N-times-a-week habit), `off`, `today`, `upcoming` or `before-start`, with its `count`. This replaces the planned `/completions?from&to` labels.
- **Still Habits II:** `/stats`, reminders, and caching streaks on the habit with a nightly reconcile (for now they're computed on each read).

### Goals
| Method | Path | Notes |
|---|---|---|
| GET | `/goals?status=ACTIVE` | includes `progress: { percent, done, total }` |
| POST | `/goals` | `{ title, description?, categoryId?, targetDate?, progressMode }` |
| GET | `/goals/:id` | milestones, linked tasks summary, linked habits |
| PATCH | `/goals/:id` | incl. `manualProgress`, `status` |
| DELETE | `/goals/:id` | soft |
| POST | `/goals/:id/milestones` | `{ title, dueDate? }` |
| PATCH | `/goals/:id/milestones/:mid` | `{ title?, dueDate?, completed?: boolean, sortOrder? }` |
| DELETE | `/goals/:id/milestones/:mid` | |
| PUT | `/goals/:id/tasks` | `{ taskIds: [] }`, replaces the linked set |
| PUT | `/goals/:id/habits` | `{ habitIds: [] }` |

### Calendar
| Method | Path | Notes |
|---|---|---|
| GET | `/calendar?from=2026-11-01&to=2026-11-30` | merged, range ≤ 62 days: `{ events: [expanded occurrences], tasks: [...], habitDays: { "2026-11-03": { scheduled: 3, done: 2 } } }` |
| POST | `/events` | `{ title, startsAt, endsAt, allDay, timezone, recurrenceRule?, recurrenceUntil?, reminderMinutes?, location?, notes?, color? }` |
| GET / PATCH / DELETE | `/events/:id` | PATCH on a recurring event: `?scope=all` only in MVP (`this`/`following` deferred) |

## 3. Endpoints: later releases (outline)

| Release | Endpoints |
|---|---|
| v1.1 Finance | `/finance/accounts`, `/finance/categories`, `/finance/transactions` (+ `?from&to&type&categoryId`), `/finance/transfers`, `/finance/budgets?month=2026-11`, `/goals/:id/contributions`, `/finance/summary?month=`, `/finance/trends?months=6` |
| v1.2 Gamification | `/gamification/profile` (xp, level, streak), `/gamification/xp-history`, `/gamification/achievements`, `/gamification/challenges` (+ `/:id/join`). **No write endpoints for XP.** XP only changes as a side effect of domain events |
| v2 Analytics | `/analytics/weekly?week=2026-W45`, `/analytics/monthly?month=`, `/analytics/trends?metric=&range=` |
| v2 AI | `POST /ai/weekly-summary`, `POST /ai/plan-day` → returns **proposals** `{ proposals: [{ type: "CREATE_TASK", payload }] }`; client applies accepted ones via the normal endpoints |

## 4. Rate limits

| Scope | Limit |
|---|---|
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | 5 / min / IP; login: 10 failures / hour / email; forgot-password: 3 emails / hour / address |
| `/auth/refresh` | 30 / min / IP |
| Authenticated default | 120 / min / user |
| `/users/me/export` | 3 / day / user |
| `/ai/*` (v2) | 20 / day / user |

**Built in 4.8** (`src/security/rate-limit.ts`, `@nestjs/throttler`, in-memory counters, per route):
- Default **100 / min**, counted **per user** when logged in and per IP otherwise (many mobile users share one public IP behind carrier NAT). This also covers `/auth/refresh`.
- `@StrictRateLimit()` **5 / min**: register, login, verify-email, resend-verification, forgot-password, reset-password, change-password, change-email, confirm-email-change.
- `/health` is never limited. Over the limit → `429 RATE_LIMITED` with `Retry-After` (seconds).
- **Per email** (`src/security/email-rate-limits.ts`, added 2026-11-08): **10 failed logins / hour / email**, from any number of IPs → `429 RATE_LIMITED` with `Retry-After`, even with the right password, until the hour ends (forgot-password stays available). A successful login resets the count. Unknown emails are counted identically. **Reset emails: 3 / hour / address**; beyond that forgot-password still answers 204 but sends nothing.
- **Not yet:** the separate refresh and default numbers above (30 and 120; both are 100 / min today), export and AI limits (those endpoints don't exist yet). `RATE_LIMIT_ENABLED=false` turns limits off (only the general e2e run does this).

## 5. Swagger / OpenAPI
- `@nestjs/swagger` generates the spec. Request bodies come from the shared Zod schemas via `@ZodBody(schema)`, which validates **and** documents from the one schema (Zod's built-in `z.toJSONSchema`, OpenAPI 3.0 target; ADR-012). Built in 4.8.
- UI at `/api/v1/docs`, JSON at `/api/v1/docs-json`, served whenever `NODE_ENV` isn't `production`. Use **Authorize** with an access token for protected routes; public routes are marked as needing none.
- Not yet: response schemas (only request bodies are documented).
- The CI job exports `openapi.json` as a build artifact so contract changes are visible in PR diffs.
