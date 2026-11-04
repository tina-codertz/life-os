# 00 — Product Vision

| | |
|---|---|
| **Purpose** | Why Life OS exists, who it is for, and what success looks like |
| **Status** | Draft v0.1, awaiting review |
| **Last updated** | 2026-11-03 |
| **Related** | [01-PRD](01-PRD.md) · [02-Functional Requirements](02-FUNCTIONAL-REQUIREMENTS.md) · [source brief](../planning.md) |

---

## 1. Vision statement

> **Life OS is one calm, trustworthy place to plan your day, build your habits, move toward your goals and understand your money, so you spend less time managing apps and more time living.**

The long-term vision is a *personal operating system*. Productivity, habits, goals, scheduling, finance and (later) an AI assistant all share one data model. That means they can inform each other: a missed habit shows up on Today, and a finished milestone moves a goal forward.

## 2. Problem statement

People who want to be intentional about their lives usually juggle 4–6 separate apps:

| Need | Typical tool | Pain |
|---|---|---|
| Tasks | Todoist, Apple Reminders | Doesn't know about habits or goals |
| Habits | Streaks, HabitBe | Isolated, no link to goals |
| Goals | Notion, paper | No progress tracking connected to daily work |
| Calendar | Google Calendar | Tasks and habits are not time-blocked |
| Money | Spreadsheets, bank apps | Disconnected from savings goals and life priorities |

**Consequences:** context switching, duplicated entry, no single view of "how am I doing?", and abandoned systems after 2–3 weeks.

**Life OS's answer:** one app, one account, one Today screen. The modules share data, and progress stays visible.

## 3. Target users

The app will be **public** (anyone can sign up). The first real user is the developer (dogfooding), and the design should not assume that.

### Primary persona — "Intentional Achiever" (MVP)
- 20–40, smartphone-first, already tries to use to-do or habit apps.
- Wants structure without heavy setup ("Notion is too much work").
- Uses dark mode and values aesthetics. Will churn from an ugly or slow app.
- **Jobs to be done:** "Tell me what matters today", "Help me keep my streak", "Show me I'm making progress".

### Secondary persona — "Budget-Conscious Planner" (v1.1)
- Tracks spending manually, saving for something specific.
- Wants budgets tied to goals ("Save TZS 2,000,000 for a laptop by June").
- Multi-currency awareness matters (e.g. TZS, USD).

### Future persona — "Reflective Optimizer" (v2)
- Wants weekly reviews, trends and AI-generated insights about routines.

### Non-target (for now)
- Teams/collaboration, enterprise, shared family budgets.

## 4. Product principles

1. **Today first.** Every feature must answer "how does this show up on Today?".
2. **Fast capture.** Creating a task or logging a habit must take ≤ 2 taps from Today plus typing.
3. **Calm, not noisy.** Few notifications, no dark patterns, and gamification that motivates without guilt.
4. **The server is the source of truth.** Streaks, XP and money totals are computed on the backend and can't be manipulated from the client.
5. **Privacy by default.** Users own their data: export it, delete it, no selling it. AI features are opt-in.
6. **Built to be understood.** The codebase is also a learning vehicle. Prefer clarity over cleverness.

## 5. Success metrics

| Metric | MVP target (first 3 months public) |
|---|---|
| Onboarding completion | ≥ 70% of sign-ups |
| Day-7 retention | ≥ 30% |
| Daily active users who log ≥ 1 habit or complete ≥ 1 task | ≥ 60% of DAU |
| Crash-free sessions | ≥ 99.5% |
| API p95 latency (read endpoints) | < 300 ms |
| Developer metric | Every module documented, tested, and explainable by the developer |

## 6. Positioning

- **Is:** a beautiful, dark-first personal life dashboard that connects tasks, habits, goals, calendar and money.
- **Is not:** a project management tool, a bank, or a social network.
- **Differentiator:** the modules are *connected* (goals ↔ tasks ↔ habits ↔ savings) and progress is *visible*, with a backend-enforced reward system.

## 7. Long-term horizon

| Horizon | Theme |
|---|---|
| MVP (v1.0) | Today, Tasks, Habits, Goals, basic Calendar, Settings |
| v1.1 | Finance (transactions, budgets, savings goals) |
| v1.2 | Gamification (XP, levels, achievements, challenges) |
| v2.0 | Analytics/reports + AI assistant (opt-in, read-mostly, user-approved actions) |
