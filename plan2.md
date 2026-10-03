I want to plan and eventually build one personal mobile application called **MyLife** using **React Native + Expo** for the mobile application and **NestJS + PostgreSQL** for the backend.

This is both:

1. A real personal application that I will actually use.
2. A long-term learning project for becoming significantly stronger in React Native, Expo, NestJS, backend architecture, software engineering, and shipping production applications.

# IMPORTANT: WE ARE CURRENTLY IN PLANNING MODE

Do NOT start writing implementation code yet.

Do NOT generate the project files yet.

Do NOT jump directly into implementation.

Do NOT design the entire final architecture upfront.

I want us to first understand and plan the product, scope, architecture, learning progression, development workflow, and version roadmap.

Act as my **product strategist + software architect + React Native/NestJS mentor + planning partner**.

Challenge my ideas where necessary instead of simply agreeing with everything.

---

# 1. PRODUCT VISION

The working name is:

**MyLife**

The idea is a personal "life operating system" / personal dashboard that helps me:

- Plan my day
- Manage tasks
- Build habits
- Track focus time
- Set goals
- Understand my personal progress
- Track finances
- Journal
- Store personal memories/photos
- Earn XP
- Maintain streaks
- Unlock achievements
- Play small games
- Eventually synchronize my data across devices

The important thing is that these should eventually feel like **one connected application**, not a collection of unrelated mini-apps.

The conceptual model is:

PLAN
↓
TRACK
↓
REFLECT
↓
ANALYZE
↓
PROGRESS
↓
GAMIFY

For example:

Goals
↓
Tasks + Habits
↓
Daily activity
↓
Focus sessions
↓
Analytics
↓
XP / achievements

---

# 2. WHY I AM BUILDING THIS

I want to become a much stronger developer by actually building and shipping something over a long period of time.

I don't want this to be another tutorial project.

I want to:

- Design features
- Make architectural decisions
- Write the code myself
- Understand why the code works
- Debug real problems
- Refactor
- Test
- Build releases
- Install the app on my phone
- Actually use it
- Discover problems through real use
- Improve it
- Eventually deploy it

I want this project to become my **React Native + Expo + NestJS playground**.

---

# 3. LEARNING GOALS

## React / React Native

I want to strengthen:

- Components
- Props
- State
- Hooks
- Custom hooks
- Context
- Derived state
- Forms
- Lists
- Performance
- Component composition
- Reusable UI
- Error/loading/empty states

## React Native

I want to learn deeply:

- Core components
- Styling
- Flexbox
- Platform differences
- Keyboard handling
- Gestures
- Animations
- App lifecycle
- Performance
- Native/device APIs

## Expo

I want experience with:

- Expo Router
- EAS
- Camera
- Image Picker
- File System
- Secure Storage
- Notifications
- Device capabilities
- Builds
- Development builds
- Production builds

## NestJS

NestJS will be the backend for this project.

I want to learn:

- Modules
- Controllers
- Services
- Dependency injection
- DTOs
- Validation
- Guards
- Authentication
- Authorization
- REST APIs
- Error handling
- PostgreSQL
- ORM/data access
- Migrations
- Relationships
- Transactions
- Pagination
- Filtering
- Searching
- File/media handling
- Configuration
- Logging
- Security
- Testing
- API documentation
- Deployment

## Software architecture

I especially want to learn how to think about:

- Separation of concerns
- Business logic
- Application logic
- Data access
- API boundaries
- Dependencies
- Module boundaries
- State ownership
- Data modeling
- Scalability
- Tradeoffs
- Avoiding unnecessary abstraction

I want to understand architecture rather than memorize patterns.

---

# 4. DEVELOPMENT PHILOSOPHY

The core principle is:

**BUILD SMALL → USE IT → LEARN → EXPAND → SHIP**

Do not build the entire application at once.

Do not create every folder/module/entity in advance.

Do not introduce a technology simply because it is popular.

Do not over-engineer the first version.

Introduce complexity when the product actually requires it.

For every important architectural decision, explain:

- What problem does it solve?
- Why do we need it now?
- What alternatives exist?
- What are the tradeoffs?
- What happens if the application grows?
- Can we postpone it?

---

# 5. AI DEVELOPMENT PHILOSOPHY

I want AI to help me learn, not replace my thinking.

Do NOT simply generate large amounts of code for me.

When we eventually start implementation, I want the workflow to be:

1. I understand the feature.
2. I attempt it myself.
3. If I'm stuck, I ask for help.
4. Explain the concept.
5. Show a small example when necessary.
6. Let me implement it.
7. Review my implementation.
8. Help me debug.
9. Refactor when appropriate.

I want to be able to explain my own code.

---

# 6. VERSION ROADMAP

The application should grow through the following versions.

Do not implement these now.

They are the long-term roadmap.

---

# VERSION 0 — FOUNDATION

Goal:

Create the clean foundation for the project.

Potential scope:

- Expo project
- React Native
- Expo Router
- Basic navigation
- Theme foundation
- Basic reusable components
- Git repository
- Development workflow

The goal is:

"I have a clean React Native + Expo application that I understand."

Do not over-engineer this version.

---

# VERSION 1 — PERSONAL DAILY DASHBOARD

This is the first real usable version.

The app should help me manage my day.

## Today

Display:

- Today's date
- Today's tasks
- Today's habits
- Focus time
- Daily progress

Example:

Good morning 👋

TODAY

Tasks
- Work
- Study React Native
- Read

Habits
- Coding
- Reading
- Exercise

Focus
- Today's focus time

Progress
- Completion percentage

## Tasks

Features:

- Create
- Edit
- Delete
- Complete
- Due date
- Priority

## Habits

Features:

- Create
- Edit
- Delete
- Complete
- Streak
- Weekly history

## Focus

Basic timer:

- Start
- Pause
- Stop
- Save session

## Persistence

Data must remain after the application is closed.

Initially use local persistence.

## Learning goals

- React state
- Hooks
- Custom hooks
- Props
- Forms
- FlatList
- Modal
- Expo Router
- React Native styling
- Flexbox
- Local persistence
- Basic data modeling
- Reusable components

### V1 milestone

**Install the application on my phone and actually use it every day.**

---

# VERSION 2 — GOALS

Introduce personal goals.

Example:

Goal:

"Become stronger at React Native"

Progress:

60%

Milestones:

- Navigation
- State
- Expo
- Native APIs
- Testing
- Deployment

Goals can connect to tasks and habits.

For example:

Goal
↓
Habits
- Code 1 hour
- Read documentation
- Build something

Tasks
- Build navigation
- Implement storage
- Add animations

Learning:

- Entity relationships
- Derived state
- Progress calculations
- Data modeling
- More complex state

---

# VERSION 3 — PERSONAL ANALYTICS

Use historical data to understand my activity.

Examples:

Coding — 12h 30m
Reading — 4h 20m
Exercise — 3h
Focus — 15h

Potential analytics:

- Daily activity
- Weekly activity
- Monthly activity
- Habit consistency
- Focus time
- Completed tasks
- Goal progress

Learning:

- Data transformation
- Aggregation
- Date/time handling
- Charts
- Analytics UI
- Performance

---

# VERSION 4 — FINANCE

Add personal finance tracking.

Sections:

- Income
- Expenses
- Categories
- Budgets
- Transactions
- History
- Reports

Example:

October

Income:
1,200,000 TSh

Expenses:
Rent — 200,000
Food — 180,000
Transport — 120,000
Other — 80,000

Remaining:
620,000

Features:

- Add transaction
- Edit transaction
- Delete transaction
- Categories
- Budgets
- Search
- Filtering
- Monthly summaries
- Charts

Learning:

- Complex CRUD
- Data modeling
- Filtering
- Searching
- Aggregation
- Relational thinking
- Local database concepts

---

# VERSION 5 — JOURNAL

Add a personal journal.

Features:

- Journal entries
- Date
- Text
- Tags
- Search
- Photos
- Media attachments

Potential Expo APIs:

- Camera
- Image Picker
- File System
- Secure Storage
- Notifications

Learning:

- Device APIs
- Media handling
- File management
- Search
- Complex forms
- Offline-first thinking

---

# VERSION 6 — GAMIFICATION

Connect the entire application through a progression system.

Examples:

Complete habit → +10 XP
Complete task → +10 XP
Focus session → +20 XP
Journal → +10 XP
Goal milestone → +100 XP

Then introduce:

- XP
- Levels
- Streaks
- Achievements
- Challenges
- Progress bars
- Unlockables

Example:

LEVEL 14

1,420 / 2,000 XP

Achievements:

- First Week
- 7-Day Streak
- 10 Hours Coding
- 20 Study Sessions
- First Goal

The goal is to make the app motivating without turning every part of life into a game.

Learning:

- Complex state
- Derived state
- Animations
- Reanimated
- Gestures
- Micro-interactions
- Game-like mechanics

---

# VERSION 7 — MINI GAMES

Eventually add a small games section.

Start with something simple such as:

Memory Match.

Features:

- Game board
- Game logic
- Score
- Timer
- Restart
- Difficulty
- Animations
- Sound
- High scores

Later:

- Multiple mini-games
- Game achievements
- Personal high scores

The purpose is to push my React Native skills into more creative and interactive UI.

Learning:

- Complex UI state
- Animations
- Gestures
- Timing
- Game state
- Performance
- Creative UI

---

# VERSION 8 — NESTJS BACKEND

Only introduce the backend once the local application has enough functionality to justify it.

The backend will use:

**NestJS + PostgreSQL**

Long-term architecture:

React Native + Expo
↓
REST API
↓
NestJS
↓
PostgreSQL
↓
Object Storage

The first backend milestone should NOT be building the entire backend.

Instead, build one complete vertical slice.

For example:

Create Habit

React Native form
↓
API request
↓
NestJS controller
↓
NestJS service
↓
Database
↓
Response
↓
React Native UI

Once I understand this complete flow, expand the backend.

Potential NestJS modules:

- Auth
- Users
- Tasks
- Habits
- Goals
- Focus
- Finance
- Journal
- Achievements
- Games

But DO NOT create all of these modules immediately.

Introduce modules as the corresponding features require them.

---

# 9. BACKEND DATA MODEL

Eventually the system may look conceptually like:

User
├── Tasks
├── Habits
│   └── Habit Completions
├── Goals
├── Focus Sessions
├── Transactions
├── Journal Entries
├── Achievements
└── Game Scores

Use PostgreSQL as the main relational database.

The exact schema should be designed when the backend phase begins.

Do not prematurely design every table now.

---

# 10. AUTHENTICATION

Eventually support:

- Registration
- Login
- Authentication
- Protected routes
- Authorization
- User-owned data

Do not implement authentication in V1 unless there is a real reason.

---

# 11. OFFLINE + SYNCHRONIZATION

Eventually the application should be capable of working offline.

Long-term model:

Local mobile data
↕
Synchronization
↕
NestJS API
↕
PostgreSQL

Do not implement complex synchronization early.

First understand:

1. Local data
2. API data
3. Authentication
4. Then synchronization

---

# 12. MULTI-DEVICE

Eventually support:

Phone
Tablet
Web

Conceptually:

Phone ─────┐
           │
Tablet ────┼──→ NestJS → PostgreSQL
           │
Web ───────┘

This is a future goal.

Do not let it complicate V1.

---

# 13. MEDIA STORAGE

Eventually journal/photos may require object storage.

Potential architecture:

React Native
↓
NestJS
↓
Object Storage

PostgreSQL should store metadata/references rather than large binary media directly where appropriate.

The exact storage provider can be decided later.

---

# 14. PROPOSED MOBILE ARCHITECTURE

A possible direction:

src/
├── app/
├── components/
├── features/
│   ├── tasks/
│   ├── habits/
│   ├── focus/
│   ├── goals/
│   ├── finance/
│   ├── journal/
│   └── games/
├── hooks/
├── services/
├── storage/
├── types/
└── utils/

However:

DO NOT assume this is the final architecture.

I want the structure to evolve with the application.

Feature-oriented organization is preferred as complexity grows, but simplicity comes first.

---

# 15. PROPOSED BACKEND ARCHITECTURE

Eventually consider something like:

src/
├── auth/
├── users/
├── tasks/
├── habits/
├── goals/
├── focus/
├── finance/
├── journal/
├── achievements/
├── games/
├── common/
├── database/
└── config/

Again, do not create everything upfront.

I want to understand when and why each layer becomes necessary.

---

# 16. API DESIGN

Eventually the mobile app should communicate through a clean API boundary.

Examples:

POST /auth/login
POST /auth/register

GET /tasks
POST /tasks
PATCH /tasks/:id
DELETE /tasks/:id

GET /habits
POST /habits
PATCH /habits/:id

POST /habits/:id/completions

GET /goals
POST /goals

POST /focus/sessions
GET /focus/sessions

These are examples only.

Do not finalize the API now.

Design it when the backend phase begins.

---

# 17. DEVELOPMENT WORKFLOW

Every feature should follow:

PLAN
↓
DESIGN
↓
IMPLEMENT
↓
TEST
↓
USE IT MYSELF
↓
FIND REAL PROBLEMS
↓
IMPROVE
↓
COMMIT
↓
SHIP

For Git:

main
│
├── feature/tasks
├── feature/habits
├── feature/focus
└── feature/goals

Use small, understandable commits.

---

# 18. TESTING STRATEGY

Testing should grow with the application.

Early:

- Manual testing
- Component behavior

Later:

- Unit tests
- Component tests
- Integration tests
- API tests
- Database tests
- E2E tests

Don't introduce a huge testing framework before there is meaningful behavior to test.

---

# 19. SHIPPING STRATEGY

I want this project to teach me how to actually ship mobile applications.

Eventually:

Git
↓
Feature branch
↓
Implementation
↓
Tests
↓
Pull request
↓
Build
↓
EAS
↓
Android APK/AAB
↓
Real device testing
↓
Release

Later:

GitHub
↓
CI/CD
↓
Tests
↓
EAS Build
↓
Production

Eventually learn:

- App signing
- Build profiles
- EAS
- Release management
- Production configuration
- Environment variables
- Error tracking
- Analytics
- Performance
- Play Store deployment

---

# 20. LEARNING MAP

For every version, explicitly identify what I am learning.

Example:

V1:
React + React Native + Expo fundamentals

V2:
Data relationships + state architecture

V3:
Analytics + data transformation

V4:
Complex CRUD + database thinking

V5:
Device APIs + media

V6:
Animation + gamification

V7:
Advanced interactive UI

V8:
NestJS + PostgreSQL + APIs

V9:
Authentication + synchronization

V10:
Testing + CI/CD + production

The application should effectively become my curriculum.

---

# 21. IMPORTANT: SEPARATE THIS FROM MY WORK

I work with different technologies at work, including Flutter and Django.

That work environment and SEVIA are valuable real-world learning experiences.

But **MyLife should primarily be my personal React Native + Expo + NestJS project.**

This gives me a dedicated environment where I can deliberately practice:

React Native
+
Expo
+
NestJS
+
PostgreSQL
+
Mobile architecture
+
Shipping

I want to use SEVIA as a reference for real-world engineering problems, but I don't want MyLife to become a copy of SEVIA.

---

# 22. HOW I WANT YOU TO PLAN WITH ME

For now, remain in PLANNING MODE.

Do not write code.

Start by helping me define:

### Product

- Product vision
- Target user (primarily me)
- Core problems
- Product principles
- Main user flows

### MVP

- Exact V0 scope
- Exact V1 scope
- What should NOT be included
- Definition of done

### UX

- Navigation
- Main screens
- Screen responsibilities
- User flows
- Information architecture

### Architecture

- Initial mobile architecture
- State strategy
- Storage strategy
- Component strategy
- Feature boundaries
- What should remain simple

### Data

- Initial entities
- Relationships
- What data belongs locally
- What can wait for the backend

### Backend

- When NestJS should be introduced
- First vertical slice
- Initial API boundary
- When PostgreSQL becomes necessary
- What should be postponed

### Learning

For every phase:

- What I will learn
- What I should implement myself
- What I should understand before moving on
- What concepts I should be able to explain

### Shipping

- Git workflow
- Testing progression
- EAS/build strategy
- Release milestones

---

# 23. CHALLENGE THE PLAN

Don't simply agree with my ideas.

Tell me if:

- A feature is unnecessary
- Something is too ambitious
- Something should be postponed
- I'm over-engineering
- Two features should be combined
- A dependency between features is missing
- The architecture is premature
- A feature creates unnecessary complexity
- There is a simpler way to learn the same concept
- The roadmap risks becoming too large to finish

I would rather have a smaller project that I actually ship than a huge project that remains unfinished.

---

# FINAL PRINCIPLE

The most important rule for this project is:

**BUILD SMALL → USE IT → LEARN → EXPAND → SHIP**

I don't want to spend months designing the perfect architecture before writing the first useful feature.

I want the architecture to evolve as my understanding and the product evolve.

For now, let's stay in planning mode and start with:

**VERSION 0 + VERSION 1**

Define them in enough detail that I will know exactly what I am building, learning, and shipping — while keeping Versions 2–10 as a high-level roadmap.v
