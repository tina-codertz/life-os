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
- `?limit=30&cursor=<opaque>`. Max limit is 100.
- Filters are explicit query params (`?status=TODO&priority=HIGH&categoryId=…&dueFrom=2026-11-01&dueTo=2026-11-07&q=rent`).
- `?sort=dueDate` / `?sort=-createdAt` (whitelisted fields only).

### Status codes
| Code | When |
|---|---|
| 200 | OK (read/update) |
| 201 | Created |
| 204 | Deleted / no content |
| 400 | `VALIDATION_FAILED`: malformed or invalid input |
| 401 | `UNAUTHENTICATED`: missing/expired token |
| 403 | `FORBIDDEN`: authenticated but action not allowed (e.g. unverified email for export) |
| 404 | `*_NOT_FOUND`: also returned for other users' resources |
| 409 | `CONFLICT` / `EMAIL_TAKEN` |
| 422 | `BUSINESS_RULE_VIOLATION`: valid shape, invalid by rule (e.g. backfill > 7 days, subtask of subtask) |
| 413 | `PAYLOAD_TOO_LARGE`: request body over the size limit |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR`: generic message only; details go to the logs |
| 503 | `SERVICE_UNAVAILABLE`: a dependency (e.g. the database) is down |

The common codes live in `packages/shared` (`COMMON_ERROR_CODES`, `ApiErrorBody`). Built in 4.1: `AllExceptionsFilter` (`apps/api/src/common/filters`) maps every thrown value to this table; features throw `AppException(status, code, message, { details, cause })`.

## 2. Endpoints: MVP

### Health
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ data: { status: "ok", db: "ok" } }`, public. DB down → 503 `SERVICE_UNAVAILABLE` (error envelope) |

### Auth (`/auth`, public, rate-limited)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, displayName }` | `201 { user, accessToken, refreshToken }` |
| POST | `/auth/login` | `{ email, password, deviceName? }` | `200 { user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` | `200 { accessToken, refreshToken }` (rotated) |
| POST | `/auth/logout` | `{ refreshToken }` | `204` |
| POST | `/auth/logout-all` | (auth) | `204` |
| POST | `/auth/verify-email` | `{ token }` | `204` |
| POST | `/auth/resend-verification` | (auth) | `204` |
| POST | `/auth/forgot-password` | `{ email }` | `204` (always, even for unknown emails) |
| POST | `/auth/reset-password` | `{ token, newPassword }` | `204`, revokes all sessions |

### Users & settings (`/users/me`)
| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | user + settings |
| PATCH | `/users/me` | `{ displayName?, onboardingCompletedAt? }` |
| PATCH | `/users/me/settings` | `{ timezone?, followDeviceTimezone?, weekStartsOn?, theme?, habitRemindersOn?, … }` |
| POST | `/users/me/change-password` | `{ currentPassword, newPassword }` |
| POST | `/users/me/export` | `202 { jobId }` → `GET /users/me/export/:jobId` returns status + download URL |
| DELETE | `/users/me` | `{ password }` → `204`, soft-deletes and revokes sessions |

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

### Tasks
| Method | Path | Notes |
|---|---|---|
| GET | `/tasks` | filters: `status, priority, categoryId, goalId, dueFrom, dueTo, q, parentId=null` (top-level only, default) |
| POST | `/tasks` | see body below |
| GET | `/tasks/:id` | includes `subtasks[]` |
| PATCH | `/tasks/:id` | partial |
| DELETE | `/tasks/:id` | soft delete → `204` |
| POST | `/tasks/:id/restore` | undo delete (≤ 30 days) |
| POST | `/tasks/:id/complete` | `200 { task, nextOccurrence? }` |
| POST | `/tasks/:id/uncomplete` | `200 { task }` |
| GET | `/tasks/history?from&to` | completed tasks grouped by local completion date |

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
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | 5 / min / IP and 10 / hour / email |
| `/auth/refresh` | 30 / min / IP |
| Authenticated default | 120 / min / user |
| `/users/me/export` | 3 / day / user |
| `/ai/*` (v2) | 20 / day / user |

## 5. Swagger / OpenAPI
- `@nestjs/swagger` generates the spec, and Zod → OpenAPI via the shared schemas (`nestjs-zod` or `zod-to-openapi`, decided in Phase 4, ADR-012).
- Served at `/api/docs` in development and staging. In production it's disabled or behind basic auth.
- The CI job exports `openapi.json` as a build artifact so contract changes are visible in PR diffs.
