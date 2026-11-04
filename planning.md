# LIFE OS — MASTER PROJECT PLANNING BRIEF

## 1. Your Role

Act as a Senior Software Architect, Product Manager, UI/UX Engineer, Technical Mentor and Full-Stack Engineering Lead.

Your responsibility is to help me plan and eventually build Life OS, a production-quality personal life management application.

You must approach this as a real software engineering project, not a quick prototype or a collection of generated screens.

**Important:** At this stage, I want you to PLAN and ANALYZE the project. Do not start implementing features, modifying existing source files, installing packages or restructuring the repository until the planning stage has been reviewed and approved.

---

## 2. Product Overview

**Product name:** Life OS

Life OS is a personal life management platform designed to help users organize, manage, monitor and improve different aspects of their daily lives from one application.

The long-term vision is to create a unified personal operating system that combines productivity, personal development, financial management, scheduling, habit formation and intelligent assistance.

The application should have a modern, minimal, polished and intuitive user experience.

It should be scalable, maintainable, secure and structured to support future expansion.

### Product objectives

- Help users organize their daily activities.
- Manage tasks, projects and priorities.
- Build consistent habits.
- Set and track personal goals.
- Manage schedules and calendars.
- Track income, expenses and budgets.
- Monitor personal productivity.
- Visualize personal progress.
- Provide intelligent recommendations.
- Eventually introduce an AI-powered personal assistant.

The initial product should focus on personal use, but the architecture should support multiple users and potential public release in the future.

---

## 3. Technology Stack

The intended technology stack is:

### Mobile application
- React Native
- Expo
- TypeScript
- Expo Router

### Backend
- NestJS
- TypeScript
- REST API
- Modular monolith architecture

### Database
- PostgreSQL
- Prisma ORM

### State management and data fetching
- Zustand for client-side application state.
- TanStack Query for server-state management.

### Forms and validation
- React Hook Form
- Zod

### Testing
- Jest
- React Native Testing Library
- NestJS testing utilities
- API integration tests

### Development and deployment
- Git and GitHub
- Docker
- GitHub Actions
- Expo EAS Build
- Swagger/OpenAPI

You may recommend changes where technically justified, but do not change the stack simply because another technology is popular.

Explain the benefits, trade-offs and migration implications of any proposed changes.

---

## 4. Architecture Requirements

I want to understand and implement a modular monolith architecture.

Do not introduce microservices unless there is a strong, clearly explained reason.

The mobile application should communicate with the NestJS backend through a documented REST API.

The backend should contain independent feature modules with clearly defined responsibilities.

Expected high-level structure:

```text
life-os/
│
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── constants/
│   │   └── assets/
│   │
│   └── api/
│       └── src/
│           ├── auth/
│           ├── users/
│           ├── tasks/
│           ├── habits/
│           ├── goals/
│           ├── schedules/
│           ├── finance/
│           ├── analytics/
│           ├── gamification/
│           ├── ai/
│           └── common/
│
├── packages/
│   └── shared/
│
├── docs/
│
├── docker-compose.yml
└── README.md
```

This is an initial proposal, not a mandatory structure. Inspect the existing repository and recommend a final structure based on actual project requirements.

Explain the responsibility of every major directory and how modules communicate.

Pay particular attention to:
- Separation of concerns.
- Dependency injection.
- Database relationships.
- API contracts.
- Error handling.
- Authentication and authorization.
- Data validation.
- Reusable components.
- Maintainability.
- Security.
- Scalability.

---

## 5. Product Modules

Plan the following modules.

### A. Dashboard / Today

The central overview of the user's day.

Features:
- Today's tasks.
- Daily priorities.
- Habit completion.
- Upcoming events.
- Daily progress.
- Quick actions.
- Productivity summary.

### B. Task Management

Features:
- Create, edit and delete tasks.
- Task descriptions.
- Priority levels.
- Categories.
- Due dates.
- Completion status.
- Recurring tasks.
- Task filtering and searching.
- Task history.
- Subtasks, where justified.

### C. Habit Tracking

Features:
- Create and manage habits.
- Daily, weekly and custom frequencies.
- Habit completion.
- Streak tracking.
- Completion history.
- Missed days.
- Reminders.
- Habit statistics.

Consider edge cases involving time zones, recurring schedules and missed days.

### D. Goals

Features:
- Create personal goals.
- Goal descriptions.
- Target dates.
- Milestones.
- Progress tracking.
- Goal categories.
- Completion status.

### E. Calendar and Scheduling

Features:
- Daily view.
- Weekly view.
- Monthly view.
- Scheduled tasks.
- Events.
- Reminders.
- Recurring schedules.

Consider how calendar events should interact with tasks and habits.

### F. Finance Management

Features:
- Income tracking.
- Expense tracking.
- Categories.
- Monthly budgets.
- Savings goals.
- Transaction history.
- Financial summaries.
- Spending trends.
- Budget alerts.

Use appropriate financial data types and precision. Do not use floating-point arithmetic for money.

### G. Gamification

Features:
- Experience points (XP).
- Levels.
- Daily streaks.
- Achievements.
- Challenges.
- Rewards.
- Milestones.

Business rules and reward calculations must be enforced by the backend.

### H. Statistics and Analytics

Features:
- Daily productivity.
- Weekly and monthly reports.
- Habit consistency.
- Task completion rates.
- Goal progress.
- Financial summaries.
- Personal trends.

### I. AI Assistant

Future functionality:
- Weekly summaries.
- Daily planning recommendations.
- Habit insights.
- Productivity analysis.
- Financial insights.
- Natural-language interaction.
- Suggestions for improving routines.

AI must not be allowed to modify important records without appropriate validation and user authorization.

### J. Settings and Personalization

Features:
- User profile.
- Light and dark themes.
- Notification preferences.
- Account settings.
- Time zone.
- Privacy preferences.
- Data export and account deletion.

---

## 6. UI/UX Direction

The visual direction is a refined, modern productivity application with a fintech-inspired aesthetic.

### Existing design preferences

- Dark-first visual experience.
- Near-black backgrounds.
- Layered dark surfaces.
- White and muted grey typography.
- Violet/indigo accent colors.
- Green for positive progress.
- Red for errors and destructive actions.
- Rounded cards.
- Clean typography.
- Subtle shadows.
- Well-organized dashboards.
- Clear visual hierarchy.
- Minimal unnecessary decoration.

An initial palette to evaluate:

```text
Background:     #0E0E12
Surface:        #1C1C22
Elevated:       #26262E
Primary text:   #FFFFFF
Secondary text: #8E8E96
Accent:         #8FB339
Error:          #D9475F
```

Treat these as initial design tokens. Evaluate whether the palette should be refined for accessibility and consistency.

Support both dark and light themes from the beginning.

### Required design work

Plan:
- Design system.
- Color tokens.
- Typography system.
- Spacing system.
- Component library.
- Navigation structure.
- Screen layouts.
- Loading states.
- Empty states.
- Error states.
- Responsive layouts.
- Accessibility.

Do not design every screen as an isolated page. Build a reusable component system.

---

## 7. Database Planning

Design a proper relational database before implementation.

Identify:
- Entities.
- Attributes.
- Primary keys.
- Foreign keys.
- Relationships.
- Constraints.
- Indexes.
- Unique constraints.
- Timestamps.
- Soft deletion requirements, if applicable.

Evaluate the relationships between:

- User
- Task
- TaskCategory
- Subtask
- Habit
- HabitCompletion
- Goal
- GoalMilestone
- CalendarEvent
- Reminder
- Transaction
- FinancialCategory
- Budget
- SavingsGoal
- Achievement
- UserAchievement
- XPTransaction
- Notification
- UserPreference

This is a proposed entity list. Do not blindly create every table. Determine which entities are necessary, how they relate and what should be deferred.

Produce:
1. Entity Relationship Diagram (ERD).
2. Proposed Prisma schema.
3. Explanation of important relationships.
4. Database indexing strategy.
5. Migration strategy.
6. Data integrity considerations.

Explain the database decisions in understandable language.

---

## 8. Development Roadmap

Create a detailed roadmap with phases, dependencies, deliverables and acceptance criteria.

Use the following stages:

### Phase 0 — Product Discovery
- Product vision.
- Problem definition.
- Target users.
- Product requirements document.
- Functional requirements.
- Non-functional requirements.
- User stories.
- Acceptance criteria.
- MVP definition.

### Phase 1 — Architecture
- System architecture.
- Database design.
- ERD.
- API architecture.
- Module boundaries.
- Technical decisions.
- Documentation.

### Phase 2 — UI/UX
- Design system.
- Navigation.
- Wireframes.
- High-fidelity designs.
- Screen states.
- Component inventory.

### Phase 3 — Project Setup
- Repository inspection.
- Monorepo configuration.
- Expo setup.
- NestJS setup.
- PostgreSQL setup.
- Prisma setup.
- Environment configuration.
- Git workflow.
- Docker configuration.

### Phase 4 — Backend Foundation
- Authentication.
- User management.
- Database migrations.
- API structure.
- Validation.
- Error handling.
- API documentation.

### Phase 5 — Mobile Foundation
- Navigation.
- Theme management.
- Reusable components.
- API client.
- State management.
- Authentication integration.
- Form handling.

### Phase 6 — Core Features
- Dashboard.
- Tasks.
- Habits.
- Goals.
- Calendar.

### Phase 7 — Gamification
- XP.
- Streaks.
- Achievements.
- Challenges.

### Phase 8 — Finance
- Income.
- Expenses.
- Budgets.
- Savings.
- Financial summaries.

### Phase 9 — Analytics and AI
- Statistics.
- Reports.
- Productivity insights.
- AI assistant.

### Phase 10 — Quality Assurance
- Unit tests.
- Integration tests.
- API tests.
- Mobile component tests.
- End-to-end tests.
- Security.
- Performance.
- Accessibility.

### Phase 11 — Deployment
- Production database.
- Backend hosting.
- CI/CD.
- Mobile builds.
- Android release.
- iOS release.
- Monitoring.

### Phase 12 — Maintenance
- Bug fixes.
- User feedback.
- Performance optimization.
- Technical debt.
- New feature planning.

The estimated timeline is 16–20 weeks, but adjust it realistically according to feature complexity and my available time.

---

## 9. My Learning Objectives

This project is also my personal software engineering learning journey.

I want to become a stronger independent full-stack engineer, not someone who can only generate applications using AI.

I specifically want to improve in:

### Frontend
- JavaScript and TypeScript.
- bun for version control
- React fundamentals.
- React Native.
- expo skills and expo ui
- Component architecture.
- Hooks.
- State management.
- API integration.
- Performance optimization.
- UI/UX implementation.

### Backend
- Node.js.
- NestJS.
- REST APIs.
- Authentication.
- Authorization.
- Dependency injection.
- Business logic.
- Validation.
- Error handling.

### Database
- SQL.
- PostgreSQL.
- Database normalization.
- Relationships.
- Indexing.
- Transactions.
- Prisma.
- Database migrations.

### Software Engineering
- Architecture.
- Design patterns.
- SOLID principles.
- Separation of concerns.
- Clean code.
- Testing.
- Git workflows.
- CI/CD.
- Deployment.
- Debugging.
- Technical documentation.

For every development phase, identify the concepts I should learn before implementing the feature.

Explain technical concepts using practical examples from Life OS.

I prefer understandable explanations, realistic examples and line-by-line code walkthroughs when necessary.

---

## 10. AI Collaboration Rules

Do not turn this project into an AI-generated code exercise.

Follow these rules:

1. Explain the problem before proposing an implementation.
2. Explain why a particular architecture or approach is appropriate.
3. Present alternatives and trade-offs when there are meaningful choices.
4. Do not introduce unnecessary dependencies.
5. Do not generate excessively complicated abstractions.
6. Do not silently modify existing files.
7. Do not skip testing.
8. Do not assume I understand code just because it compiles.
9. Encourage me to implement smaller parts independently.
10. Review my implementation and identify weaknesses.
11. Explain bugs and how to diagnose them.
12. Keep documentation updated.
13. Distinguish between confirmed decisions and proposed decisions.
14. Do not move to the next major phase without reviewing the previous deliverables.

When generating implementation plans, provide:
- Files to create or modify.
- Their responsibilities.
- Data flow.
- API contracts.
- Dependencies.
- Implementation sequence.
- Tests.
- Acceptance criteria.

Claude should provide clear, complete and technically grounded implementation briefs that can be transferred into Cursor without losing architectural context.

---

## 11. Project Management

Maintain the following documentation:
we will deploy this app on our own

```text
docs/
├── 00-PRODUCT-VISION.md
├── 01-PRD.md
├── 02-FUNCTIONAL-REQUIREMENTS.md
├── 03-USER-FLOWS.md
├── 04-SYSTEM-ARCHITECTURE.md
├── 05-DATABASE-DESIGN.md
├── 06-API-SPECIFICATION.md
├── 07-DESIGN-SYSTEM.md
├── 08-DEVELOPMENT-ROADMAP.md
├── 09-TESTING-STRATEGY.md
├── 10-DEPLOYMENT-STRATEGY.md
├── 11-TECHNICAL-DECISIONS.md
└── 12-LEARNING-LOG.md
```

Use a milestone-based workflow.

Every milestone should contain:
- Objectives.
- Tasks.
- Dependencies.
- Learning objectives.
- Deliverables.
- Acceptance criteria.
- Testing requirements.
- Definition of done.

Track progress explicitly. Never mark work as complete simply because code has been generated.

---

# 12. YOUR FIRST ASSIGNMENT: PLANNING ONLY

Start by inspecting the existing Life OS repository.

Expected location:
/life-os

Expected GitHub repository:
`tina-codertz/life-os`


Do not expose secrets or print environment variable values.

### Deliverable 1 — Product Blueprint
Produce a complete product requirements document, including:
- Product vision.
- Target users.
- Problems being solved.
- MVP scope.
- Future scope.
- User stories.
- Functional requirements.
- Non-functional requirements.
- Acceptance criteria.

### Deliverable 2 — Technical Architecture
Produce:
- System architecture diagram.
- Recommended monorepo structure.
- Backend module boundaries.
- Mobile architecture.
- API communication strategy.
- Authentication approach.
- State management strategy.
- Error handling strategy.
- Security considerations.

### Deliverable 3 — Database Design
Produce:
- ERD.
- Entity descriptions.
- Relationships.
- Initial Prisma schema proposal.
- Constraints and indexes.
- Migration strategy.

### Deliverable 4 — UI/UX Planning
Produce:
- Navigation architecture.
- Screen inventory.
- Main user flows.
- Design system specification.
- Component inventory.
- Dark and light theme strategy.

### Deliverable 5 — Development Roadmap
Create a detailed, dependency-aware 16–20-week plan.

Break it into weekly milestones and smaller implementation tasks.

For every task, specify:
- Expected outcome.
- Concepts to study.
- Required files or modules.
- Dependencies.
- Testing approach.
- Completion criteria.

### Deliverable 6 — Learning Roadmap
Create a parallel learning curriculum covering JavaScript/TypeScript, React Native, NestJS, SQL, PostgreSQL, architecture and testing.

Connect each learning topic to a practical Life OS feature.

---

## 13. How to Present Your Response

Structure your initial response as follows:

1. Executive summary.
2. Product vision and MVP definition.
3. Functional and non-functional requirements.
4. System architecture.
5. Database architecture.
6. Mobile application architecture.
7. Backend architecture.
8. UI/UX direction.
9. Development roadmap.
10. Parallel learning roadmap.
11. Risks and technical considerations.
12. Immediate next steps.

Be specific, technically detailed and critical.

Do not give generic software development advice. Make recommendations based on Life OS.

If information is missing, identify assumptions and ask only essential questions.

**Most importantly: Do not start implementation yet. Complete the planning and repository assessment first. Wait for my review and approval before modifying the project.**

The ultimate goal is to build a well-engineered, production-quality Life OS this will be a public app anyone can be able to use it  while developing my ability to independently design, understand, implement, test and maintain full-stack software systems.



Life OS — Complete Development Roadmap
I want you to approach Life OS as both a real software product and your personal software engineering learning project.

The goal isn't simply to build an app that tracks habits and tasks. The goal is to take a product from an idea, understand its architecture, design its database, build its backend and mobile application, test it, deploy it, and eventually maintain it like a professional software engineer.

We'll build it progressively. You should understand why we're making each decision rather than just asking AI to generate code.

Remindion - AI Life Manager

Habit & Focus Product Suite by Andrew Oliinyk on Dribbble

To-Do Pro: Simplify Your Tasks - Dark Mode by Hiren Panara on Dribbble

1. Product vision
Life OS is a personal life management application that brings different aspects of your daily life into one place.

Its purpose is to help users:

Organize their daily activities.

Build consistent habits.

Set and achieve goals.

Manage tasks and projects.

Track personal finances and budgets.

Monitor productivity and personal progress.

Understand their routines through statistics.

Eventually use AI as a personal assistant.

Core modules
Module

Main functionality

Dashboard

Daily overview, progress and priorities

Tasks

Create, organize and complete tasks

Habits

Daily habits, streaks and tracking

Goals

Long-term goals and milestones

Calendar

Daily, weekly and monthly planning

Finance

Income, expenses and budgets

Statistics

Progress, trends and insights

AI Assistant

Recommendations and personal insights

Settings

Profile, preferences and app configuration

We won't build everything simultaneously. We'll build a strong foundation first.

2. Recommended technology stack
I recommend keeping the architecture consistent with the direction you previously chose for this project.

🚀 Setting Up Your React Native Development Environment - DEV Community

Mobile application — React Native + Expo

Screens, navigation, components and application state.

Clean Architecture and Folder Structure — Nest JS | by Ankitdetroja | Medium

Backend — NestJS

REST APIs, business logic, authentication and modules.

Postgresql Logo PNG Transparent With Clear Background ID 473068 |  TOPpng

Database — PostgreSQL

Relational data, relationships, constraints and queries.

Prisma.io Logo PNG,  Vector (AI, EPS, CDR, PDF, SVG) - iconLogoVector

ORM — Prisma

Database schema, migrations and type-safe queries.

TypeScript Logo Icons for Web and App Development

Language — TypeScript

Shared language across the mobile and backend projects.

Additional tools:

Git and GitHub — source control.

Expo Router — navigation.

TanStack Query — server-state management.

Zustand — local application state.

React Hook Form + Zod — forms and validation.

Jest and React Native Testing Library — testing.

Swagger — API documentation.

Docker — development environment and deployment.

GitHub Actions — CI/CD.

Architecture recommendation: Start with a modular monolith, not microservices. One backend application, with clearly separated modules. This is easier to understand, develop, test and maintain as a growing product.

3. The complete development roadmap
I would divide the project into 12 phases. Each phase has a development outcome and a learning outcome.

Development journey
Phase 0 — Product discovery

Planning
Define the problem, users, requirements, features and MVP.

Phase 1 — Software architecture

Design the system, modules, database and communication between applications.

Phase 2 — UI/UX design

Design the design system, navigation, screens and interactions.

Phase 3 — Project setup

Configure Git, monorepo, Expo, NestJS, PostgreSQL, Prisma and development environments.

Phase 4 — Backend foundation

Build authentication, database models, API structure and validation.

Phase 5 — Mobile foundation

Build navigation, reusable components, themes, state management and API integration.

Phase 6 — Core functionality

Develop tasks, habits, goals, schedules and dashboard.

Phase 7 — Gamification

Develop XP, streaks, achievements, challenges and rewards.

Phase 8 — Finance management

Develop budgets, expenses, income, savings and financial insights.

Phase 9 — Intelligence and analytics

Develop statistics, productivity insights and AI assistance.

Phase 10 — Quality engineering

Testing, security, performance, error handling and accessibility.

Phase 11 — Deployment and release

Production backend, database hosting, mobile builds and store preparation.

Phase 12 — Maintenance and evolution

Monitoring, feedback, improvements and future features.

4. Detailed implementation plan
Phase 0: Product discovery
Before writing code, understand what you're building.

Create these documents:

Document

What it contains

README.md

Product overview

PRD.md

Product requirements

FEATURES.md

Feature breakdown

USER_FLOWS.md

How users navigate the app

ROADMAP.md

Development milestones

DECISIONS.md

Important technical decisions

Define your first user journey:

User opens Life OS.

User creates an account.

User completes onboarding.

User arrives at the dashboard.

User creates a task.

User creates a habit.

User tracks daily progress.

User reviews their progress.

Learning objectives:

What is a product requirement?

What is an MVP?

What is a user story?

What is a use case?

How do functional and non-functional requirements differ?

Example user story:

As a user, I want to create a daily habit so that I can track my consistency over time.

Acceptance criteria:

User can create a habit.

User can specify its frequency.

User can mark it as completed.

Completion is saved.

The system updates the streak correctly.

Phase 1: System architecture
This is one of the most important phases because I want you to understand how professional applications are structured.

Accelerated Product Development Framework

Your architecture:

Mobile application

React Native · Expo · Expo Router

API layer

REST API · HTTP · JSON

NestJS backend

Authentication · Modules · Services · Business logic

Prisma ORM

Database access · Migrations

PostgreSQL

Persistent relational data

Learn these concepts before implementation:

Client-server architecture.

REST APIs.

HTTP methods and status codes.

Authentication versus authorization.

Database relationships.

Modular monolith architecture.

Separation of concerns.

Dependency injection.

Data validation.

Error handling.

Your first architecture deliverable should be a system diagram and a database entity relationship diagram (ERD).

Phase 2: UI/UX design
Your existing visual direction is a refined fintech-inspired interface: violet/indigo accents, near-black and off-white surfaces, rounded cards, progress visualizations and semantic light/dark themes.

Schedule Mobile - Productivity Management by Tio Gilang Pratama for Plainthing Studio on Dribbble

HabitBe - Habit Tracker App for iPhone, iPad & Mac | Build Better Routines

Mobile Calendar App by Courage Egbude on Dribbble

Design these screens before implementing them:

Screen

What to design

Splash

Branding and loading

Onboarding

Introduction and setup

Authentication

Login and registration

Today

Daily dashboard

Tasks

Task management

Habits

Habit tracking

Goals

Goals and milestones

Calendar

Schedule

Statistics

Progress and analytics

Finance

Financial dashboard

Settings

User preferences

Also create a reusable design system:

Colors and semantic tokens.

Typography.

Spacing.

Border radius.

Shadows.

Buttons.

Cards.

Inputs.

Modals.

Bottom navigation.

Loading and empty states.

Don't design every screen independently. Build a consistent system.

Phase 3: Project setup
I recommend this monorepo structure:

life-os/
│
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── constants/
│   │   └── assets/
│   │
│   └── api/
│       └── src/
│           ├── auth/
│           ├── users/
│           ├── tasks/
│           ├── habits/
│           ├── goals/
│           ├── schedules/
│           ├── finance/
│           └── common/
│
├── packages/
│   └── shared/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── API.md
│
├── docker-compose.yml
└── README.md
Your setup checklist:


Create or inspect the existing GitHub repository.

Establish the monorepo.

Configure Expo.

Configure NestJS.

Configure PostgreSQL.

Configure Prisma.

Set up environment variables.

Configure ESLint and Prettier.

Set up Git branches.

Create the first successful mobile and API builds.
Your existing project is at Mobile_Apps/personal-app, with tina-codertz/life-os as the intended GitHub repository. Inspect its existing contents before restructuring or overwriting anything.

Phase 4: Backend development
Build the backend in this order:

Order

Module

What you learn

1

Auth

Authentication, JWT, password hashing

2

Users

CRUD, relationships

3

Tasks

CRUD, filtering, pagination

4

Habits

Business rules, tracking

5

Goals

Milestones, progress

6

Schedules

Dates, recurring events

7

Gamification

XP, streak calculations

8

Finance

Transactions, aggregation

9

Analytics

Queries and reporting

10

AI

External AI integration

For every backend module, follow this pattern:

Module
  ├── Controller
  ├── Service
  ├── DTO
  ├── Entity/Prisma models
  └── Tests
Understand the responsibilities:

Controller: receives HTTP requests.

Service: contains business logic.

DTO: validates incoming data.

Prisma: communicates with the database.

Tests: verify expected behaviour.

For example, when creating a task, the mobile application sends a request to the API. The controller receives it, the service applies business rules, Prisma saves it, and the API returns the result.

Phase 5: Mobile foundation
Build the mobile application foundation before adding all the features.

Implementation order:

Expo Router navigation.

Authentication screens.

Theme management.

Reusable UI components.

API client.

Authentication state.

Global state management.

Form validation.

Error and loading states.

Offline and connectivity handling.

One important distinction: use TanStack Query for server data and Zustand for local UI/application state. Avoid duplicating the same server data in both.

Phase 6: Core Life OS modules
Now start building the actual product.

VoxTask — Mobile Task Manager Built with AI | Blink

6.1 Today dashboard

Daily priorities, completed tasks, habit progress, upcoming activities and quick actions.

TimeNoder2 - Turn each day into simple and actionable steps | TimeNoder2

6.2 Task management

Create, edit, delete, prioritize, categorize and filter tasks. Add due dates and recurring tasks.

HabitBe - Habit Tracker App for iPhone, iPad & Mac | Build Better Routines

6.3 Habit tracking

Frequency, reminders, daily completion, streaks, missed days and history.

Momentum | Achieve with Momentum

6.4 Goals

Long-term objectives, milestones, deadlines and progress tracking.

Moleskine Everyday

6.5 Calendar and scheduling

Daily, weekly and monthly views, scheduled tasks and reminders.

Important: Complete each module end-to-end. Don't build five unfinished screens and then move to another feature.

For example, the Tasks module is complete only when you can create a task, save it to PostgreSQL, retrieve it, edit it, delete it and see the changes on the mobile application.

Phase 7: Gamification
Introduce motivation mechanisms after the core functionality works.

XP points.

Daily streaks.

Weekly challenges.

Achievements.

Levels.

Rewards.

Progress milestones.

Learn how to implement business rules on the backend so users cannot manipulate their XP simply by changing something in the mobile application.

Phase 8: Finance management
Personal Finance App for Budget Tracker Dashboard by Muhsin ✪ on Dribbble

Build:

Income tracking.

Expense tracking.

Categories.

Monthly budgets.

Savings goals.

Transaction history.

Financial summaries.

Budget alerts.

Learn database aggregation, date filtering, financial precision and transaction consistency. Use appropriate decimal types for money rather than floating-point calculations.

Phase 9: Analytics and AI
Analytics

Daily productivity.

Habit consistency.

Weekly and monthly reports.

Task completion rate.

Goal progress.

Spending patterns.

AI assistant

Eventually, the AI assistant could:

Summarize your week.

Identify inconsistent habits.

Suggest realistic daily priorities.

Analyze productivity trends.

Help plan your next week.

Explain spending patterns.

Don't let AI directly modify important user records without validation and explicit authorization.

Phase 10: Testing and quality
Learn and implement:

Testing type

What it checks

Unit testing

Individual functions and business logic

Integration testing

Modules working together

API testing

HTTP endpoints

Component testing

React Native components

End-to-end testing

Complete user journeys

Security testing

Authentication and permissions

Also cover:

Database migrations and backups.

API rate limiting.

Input validation.

Secure token storage.

Error monitoring.

Performance profiling.

Accessibility.

Light and dark theme consistency.

Phase 11: Deployment
Your release pipeline should look like this:

Development
     ↓
Feature branches
     ↓
Local testing
     ↓
Automated tests
     ↓
Development API + Database
     ↓
Staging
     ↓
Production
     ↓
Android / iOS release
Learn:

Docker.

CI/CD.

Environment configuration.

Database hosting.

Backend deployment.

Expo EAS Build.

App Store and Google Play submission.

Production monitoring.

Phase 12: Maintenance
After launching:

Monitor crashes and errors.

Analyze performance.

Fix bugs.

Improve UX.

Collect feedback.

Review technical debt.

Plan feature releases.

Keep dependencies updated.

This is where you learn that software development doesn't end when an app is released.

5. How you should learn while developing
This is particularly important. I don't want you to become dependent on AI-generated code.

Use this development cycle for every feature:

Your learning and development cycle
Understand — Study the concept and read documentation.

Plan — Write down what the feature needs to do.

Design — Think about the data, interfaces and architecture.

Implement — Write the code yourself, using AI for guidance.

Explain — Explain every important part of the code in your own words.

Test — Verify that the feature behaves correctly.

Review — Ask AI to review your architecture, code quality and potential problems.

Document — Record what you learned and decisions you made.





design links inspo https://dribbble.com/shots/27190292-Personal-Finance-App-for-Budget-Tracker-Dashboard?utm_source=chatgpt.com
https://habitbe.app/?utm_source=chatgpt.com
https://dribbble.com/shots/20039005-Mobile-Calendar-App?utm_source=chatgpt.com
https://dribbble.com/shots/27218746-Smart-Productivity-App-UI-Time-Tracking-Daily-Task-Planner?utm_source=chatgpt.com
https://dribbble.com/shots/18640807-Habit-Tracker-App?utm_source=chatgpt.com
https://remindion.com/?utm_source=chatgpt.com
https://dribbble.com/shots/24729957-To-Do-Pro-Simplify-Your-Tasks-Dark-Mode?utm_source=chatgpt.com
https://medium.com/design-bootcamp/5-beautifully-designed-apps-on-my-iphone-2023-cf637acec794?utm_source=chatgpt.com
https://systembionic.com/xified?utm_source=chatgpt.com
