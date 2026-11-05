# Life OS

A personal life management app that brings tasks, habits, goals, calendar and (later) finances, gamification and an AI assistant into one calm, dark-first mobile experience.

> **Status:** Phases 0–1 (discovery and architecture) approved 2026-11-04. Next: Phase 3, project setup.

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native · Expo · Expo Router · TypeScript |
| State / data | TanStack Query (server state) · Zustand (client state) |
| Forms | React Hook Form · Zod (schemas shared with the API) |
| Backend | NestJS (modular monolith) · REST · Swagger/OpenAPI |
| Database | PostgreSQL 18 · Prisma |
| Tooling | Bun workspaces (package manager) · Node LTS runtime · Git/GitHub · GitHub Actions |
| Hosting | Self-hosted VPS · Docker Compose · Caddy · EAS Build for mobile |
| Testing | Jest · React Native Testing Library · Supertest · Maestro |

## Documentation

| # | Document | Contents |
|---|---|---|
| 00 | [Product Vision](docs/00-PRODUCT-VISION.md) | Vision, problem, personas, principles, metrics |
| 01 | [PRD](docs/01-PRD.md) | MVP vs later releases, assumptions, risks |
| 02 | [Functional Requirements](docs/02-FUNCTIONAL-REQUIREMENTS.md) | FR/NFR IDs, user stories, acceptance criteria |
| 03 | [User Flows](docs/03-USER-FLOWS.md) | Navigation tree, screen inventory, key flows |
| 04 | [System Architecture](docs/04-SYSTEM-ARCHITECTURE.md) | Monorepo, modules, auth, errors, security |
| 05 | [Database Design](docs/05-DATABASE-DESIGN.md) | ERD, Prisma schema, indexes, migrations |
| 06 | [API Specification](docs/06-API-SPECIFICATION.md) | REST conventions and endpoints |
| 07 | [Design System](docs/07-DESIGN-SYSTEM.md) | Tokens, typography, components, a11y |
| 08 | [Development Roadmap](docs/08-DEVELOPMENT-ROADMAP.md) | Weekly milestones and progress tracker |
| 09 | [Testing Strategy](docs/09-TESTING-STRATEGY.md) | Test pyramid, matrices, CI gates |
| 10 | [Deployment Strategy](docs/10-DEPLOYMENT-STRATEGY.md) | VPS topology, CI/CD, backups, store release |
| 11 | [Technical Decisions](docs/11-TECHNICAL-DECISIONS.md) | ADR log (Confirmed vs Proposed) |
| 12 | [Learning Log](docs/12-LEARNING-LOG.md) | Learning curriculum and personal log |

The original planning brief is in [planning.md](planning.md).

## Planned repository layout

```text
apps/mobile        Expo app
apps/api           NestJS API + Prisma
packages/shared    Zod schemas, types, date/money helpers
docs/              Project documentation
```
