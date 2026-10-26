# MyLife — Product & Build Plan (V0 → V1, roadmap to V10)

## Context

James is building **MyLife**, a personal "life operating system" mobile app — daily dashboard, tasks, habits, focus time, and later goals, analytics, finance, journal, gamification, and mini-games. It is simultaneously a real app they will daily-drive and a deliberate long-term learning project for **React Native + Expo** (and later **NestJS + PostgreSQL**). Their day job uses Flutter/Django; this project is dedicated RN/Node practice.

Guiding principle (non-negotiable): **BUILD SMALL → USE IT → LEARN → EXPAND → SHIP.** Claude acts as mentor/reviewer; James writes the code — no big generated code dumps.

## Decisions made (with James, 2026-10-03)

| Decision | Choice |
|---|---|
| Stack | React Native + Expo (Expo Router, TypeScript strict); NestJS + PostgreSQL deferred to V8 |
| V1 split | **V1a** = Today dashboard + Tasks + Habits (streaks, weekly history); **V1b** = Focus timer. Ship & daily-drive V1a first |
| Design | Full screenshot style from day one; simple mascot (emoji/free illustration), custom art later (V6) |
| Storage | AsyncStorage (JSON) behind a repository layer; migrate to expo-sqlite at V3 as a deliberate lesson |
| Platform | Cross-platform dev via Expo Go; primary install target decided at the V1a EAS-build milestone |
| Tooling (revised 2026-10-25) | Expo SDK 57 template → routes live in **`src/app/`**; package manager is **bun** (`bunx expo install …`, `bunx eas-cli …`) |
| Tabs (revised 2026-10-25) | **Today / Tasks / Habits / Settings**. Stats tab is added at V3 when there is data to show — no empty placeholder tab for months |

## Challenges raised (and accepted)

- Original V1 was 4 features before first real use — split into V1a/V1b so the daily check-in loop ships in weeks.
- Quantified habits ("15/20 minutes" badges in the screenshot) are a 3× scope multiplier (targets, units, partial progress) — **V1a habits are boolean check-offs; quantified habits move to V2.** Streak flame badge replaces the count badge.
- Habit weekday scheduling (Mon/Wed/Fri-only habits) postponed — V1a habits are daily.
- The curved/notched tab bar, animated rings, and custom mascot art are polish traps — backlog, not V0/V1.

## Design language (from the two screenshots)

Reference files (in project root):
1. **`Screenshot 2026-09-29…png` (habit tracker, dark)** — dark theme, rounded pill cards, horizontal week-strip calendar, pastel icon tiles, green circular FAB over a 4-icon bottom nav, mascot empty state with red "Create habit" button, time-of-day tabs (All Day / Morning / Afternoon), per-habit badges, challenge cards with % progress bars.
2. **`Screenshot 2026-09-28…png` (progress dashboard, light)** — greeting header with avatar; hero **"Your Progress" card: large % + circular progress ring** with date selector; **2-column "Your Activities" stat-tile grid**, each tile = icon + title + mini visualization (ring / bar chart with current period highlighted / sparkline / line chart) + trend badge ("+35%", "−20%"). We adapt these *layouts* onto the dark palette.

**Progress & heatmap design rules (applies across versions):**
- Today screen daily progress = **"Your Progress" card with large % + circular ring** (screenshot 2). V1a ships the card with text % ("3/5 habits · 60%"); the SVG ring is a V1a stretch goal / early-V2 polish.
- Habit cards use pill badges (streak `🔥 5` in V1a; "15/20" counts in V2) — screenshot 1 style.
- Analytics (V3) = screenshot-2 **stat-tile grid**: focus-time bar chart with current day highlighted, tasks-completed sparkline, habit-consistency ring, each with trend badge vs. previous period.
- **Heatmap (V3)**: GitHub-style day-grid of habit consistency, intensity mapped to the green accent on dark surface, rendered as a full-width rounded card in the same tile system.
- Navigation: 4 tabs (Today, Tasks, Habits, Settings; Stats joins at V3) + raised green center FAB. Empty states: mascot + single CTA.

---

## V0 — Foundation (~1 week of evenings)

### Setup (done — project lives in `life-os/MyApp`, managed with bun)
```bash
cd life-os/MyApp
bunx expo install expo-crypto @react-native-async-storage/async-storage
bunx expo install date-fns
```
Packages: `expo-router` (bundled), `date-fns` v4 (pure functions > dayjs chaining for learning), `expo-crypto` for `Crypto.randomUUID()`, `@expo/vector-icons` (Ionicons). **Reanimated ships in the template but is not used until V2+.** Postponed: Zustand/Redux, SQLite, notifications, haptics, custom fonts. Always check the SDK 57 docs before using an Expo API (see `MyApp/AGENTS.md`).

**Config (fixed 2026-10-25):** `app.json` → `userInterfaceStyle: "dark"` (app is dark-only) and replace the template splash colour `#208AEF` with `bg`.

**React Compiler is turned off** (`experiments.reactCompiler: false`). It auto-memoizes components and values, which changes the V1a lessons on `useMemo` and re-renders. Decision: keep it **off** until V1a ships so re-renders and manual memoization are learned first, then turn it on as a lesson (compare before and after).

### Folder structure (minimal — no empty feature dirs)
```
src/
├── app/                  # ROUTES ONLY, thin files (<~30 lines)
│   ├── _layout.tsx       # root Stack + providers
│   └── (tabs)/_layout.tsx + index.tsx (Today) + tasks.tsx + habits.tsx + settings.tsx
├── theme/                # colors.ts, spacing.ts, typography.ts
├── components/           # the 5 base components
└── lib/                  # dates.ts (toDateKey/todayKey), id.ts
```
`src/features/` and `src/storage/` appear in V1a when the first feature needs them.

### Theme tokens (sampled from screenshot 1; dark-only)
`bg #0E0E12 · surface #1C1C22 · surfaceRaised #26262E · textPrimary #FFF · textSecondary #8E8E96 · accentGreen #8FB339 · accentRed #D9475F · pastels: pink #F2A69B, lavender #B6B3E8, lilac #E8B5D8, blue #BFD9EE, green #CDE7A6`. Radius: cards 20–24, pills 999. Typography variants: title 24/bold, heading 18/semibold, body 16, caption 12/muted (matches `src/theme/typography.ts`). **Rule: no hex literals outside `src/theme/`; habit colors stored as token keys (`'pastelPink'`), not hex — survives DB migrations.**

### Base components — exactly five
`Screen` (SafeArea + bg + padding) · `AppText` (variant prop) · `Card` (surface, radius 20, optional Pressable) · `Button` (primary red pill / ghost) · `IconTile` (pastel rounded square + emoji). Week strip, badges, etc. are built inside features in V1a and promoted only when reused.

### Tabs + FAB
Expo Router `<Tabs>` with 4 screens, no labels, dark `tabBarStyle`, red active tint. **FAB = absolutely positioned `Pressable` sibling overlaying the `<Tabs>`** in `(tabs)/_layout.tsx` (green circle, bottom ≈36 **plus the safe-area bottom inset** so it clears Android gesture bars and the iPhone home indicator, centered) — NOT a dummy fifth tab, NOT a custom tabBar. The notched/curved bar is a backlog polish item.

### V0 Definition of Done
- Runs in Expo Go on both iOS and Android devices
- 4 dark tabs + floating green FAB (logs press); each placeholder screen exercises the 5-component kit
- No hex colors outside theme; ≥4 meaningful conventional commits; James can explain every file

---

## V1a — Today + Tasks + Habits (~2–4 weeks of evenings)

### Data model (UUID string PKs, ISO strings — survives SQLite/PostgreSQL later)
```ts
Task  { id, title, notes?, dueDate: 'YYYY-MM-DD'|null, priority: 'low'|'medium'|'high',
        completedAt: ISO|null /* doubles as done flag */, createdAt, updatedAt, deletedAt: ISO|null }
Habit { id, title, icon /* emoji */, color: PastelKey, timeOfDay: 'morning'|'afternoon'|'allday',
        createdAt, updatedAt, archivedAt: ISO|null /* user-facing "archive", history kept */,
        deletedAt: ISO|null }
HabitCompletion { id, habitId, date: 'YYYY-MM-DD' /* LOCAL day key */, completedAt: ISO,
                  updatedAt, deletedAt: ISO|null /* un-check = set deletedAt, not remove */ }
```
**Sync-readiness rule (cheap now, painful at V9):** every entity has `updatedAt`, and nothing is ever removed from storage — "delete" sets `deletedAt` (a tombstone). All reads filter out `deletedAt != null`. Re-checking a habit on a day that has a tombstoned completion clears `deletedAt` instead of creating a duplicate. Sync later needs both fields to know what changed and what was deleted.

### Storage (`src/storage/`)
`storage.ts` is the **only** file importing AsyncStorage: `readCollection<T>(key)` / `writeCollection<T>(key, items)`. Versioned keys: `mylife.tasks.v1`, `mylife.habits.v1`, `mylife.habitCompletions.v1`. Per-entity repos expose only `getAll`/`saveAll` (whole-collection; reducers own mutation logic). At V3 only the repos change.

### State: React Context + useReducer (not Zustand — deliberately)
Zustand would be less code, but Context + reducer teaches the primitives Zustand builds on; migrate later when re-renders actually hurt (V3–V4) as a motivated lesson. One provider per domain: `TasksProvider`, `HabitsProvider` (habits + completions share a reducer since streaks need both), mounted in `src/app/_layout.tsx`, consumed via `useTasks()`/`useHabits()` hooks. **Persistence pattern:** pure reducer; provider `useEffect` saves after state changes, gated by an `isReady` hydration flag (hydrate on mount → `dispatch({type:'hydrated'})`) so an empty array never overwrites stored data. Screens show a loading state (or keep the splash screen up) until both providers are ready.

### Streaks: derive, don't store
Build a `Set` of completion date-keys; start from today **or yesterday if today isn't done yet** (streak isn't broken until the day ends); walk back with `subDays` counting hits. Derived = one source of truth, powers weekly history and V3 analytics for free; `useMemo` if it ever matters. **Timezone rule (Tanzania = UTC+3): all day keys via one `toDateKey()` helper using `format(d,'yyyy-MM-dd')` — `toISOString().slice(0,10)` is banned (UTC would mis-date pre-3am check-ins and break streaks).**

### Behaviour rules (decide before building — real use hits these in week one)
- **Daily progress %** = (habits done today + tasks completed today) ÷ (active habits + tasks due today or overdue that were open at the start of today). Card text: "6/9 done · 67%". Habits-only was too narrow given tasks sit on the same screen.
- **Time-of-day filter**: "All Day" shows everything; "Morning" shows morning + allday habits; "Afternoon" shows afternoon + allday habits. Tasks are not filtered.
- **Weekly dots**: days before the habit's `createdAt` render as an empty outline (didn't exist yet), not as missed; future days render dimmed.
- **Editing past days**: tapping a past day in the week strip shows that day's habits **editable** (back-fill a forgotten check-in) for the current week; older days are read-only. A forgotten tick before midnight must not cost a streak.
- **Archived habits** are hidden from Today and the habits list but their completions stay; their streak is not shown.

### Build order
1. **Tasks end-to-end first** (simplest entity, proves pipeline: types → repo → provider → UI → persistence). Create/edit via modal route `src/app/task-form.tsx` (`presentation:'modal'`, `useLocalSearchParams` for edit). Form: title, notes, priority pills, due date ("Today / Tomorrow / Pick date" + `@react-native-community/datetimepicker`). Complete = tap circle; delete = long-press + Alert confirm (swipe postponed). **Tasks tab** = full list grouped Overdue / Today / Upcoming / No date, with a "Show completed" toggle; Today's "See all" links here. (Check whether the SDK 57 `@expo/ui` date picker fits before adding `@react-native-community/datetimepicker`.)
2. **Habits**: form modal (title, emoji via TextInput — custom emoji grid is a trap, color = 5 pastel swatches, timeOfDay pills). Habit card per screenshot 1: IconTile + title + streak pill badge; tap toggles today's completion. **Weekly history**: 7 dots (Mon–Sun) filled from the completion Set.
3. **Today screen** (integration): date header + avatar tile; **week strip** (`startOfWeek` weekStartsOn:1, selected day = green circle; tapping a past day shows that day's habits per the editing rule above; multi-week scroll postponed); greeting by hour; All Day/Morning/Afternoon segmented filter; Tasks section (today + overdue, top 5, "See all"); Habits section; **"Your Progress" card with text %** (ring = stretch); mascot empty state (🌙 + emoji/free illustration + red "Create habit" button); FAB opens "New task / New habit" chooser.

### V1a Definition of Done (= verification)
- Task CRUD + complete; habit CRUD + daily check-off; **all data survives full app kill/restart**
- Streak correct across: consecutive days, missed day, first completion, un-checking today, back-filling yesterday
- Deleted tasks / un-checked habits are tombstoned (`deletedAt`), never removed from storage
- Weekly dots match reality (incl. habit created mid-week); Today screen matches reference structure incl. progress card and empty state
- **First EAS build (`eas build --profile preview`) installed on the real daily phone** — Expo Go ≠ shipped; decide primary platform here (Android APK is frictionless; iPhone needs Apple Dev account)
- Daily-driven ≥1 week; real issues filed in `BACKLOG.md`

---

## V1b — Focus Timer (~1–2 weeks, only after daily-driving V1a)

**Timestamps, never tick-counting** (JS timers freeze in background):
```ts
FocusSession { id, startedAt: ISO, endedAt: ISO, durationMs, label: string|null }   // persisted on save
TimerState = {status:'idle'} | {status:'running', startedAt: epochMs, accumulatedMs}
           | {status:'paused', accumulatedMs}                                        // in-memory union
```
Elapsed = `accumulatedMs + (Date.now() − startedAt)`; the 1s `setInterval` only re-renders the clock (cleared on unmount). `AppState` return-to-active is automatically correct because elapsed is derived — that's the lesson. **The running/paused `TimerState` is also persisted** (`mylife.activeTimer.v1`, written on every start/pause/resume/stop) and restored on launch, so a session survives the OS killing the app in the background. `useKeepAwake()` on the timer screen. Stop → confirm → save via `focusRepo` (`mylife.focusSessions.v1`); discard <60s. UI: big time display, green Start/red Stop pills; entry = "Focus · 45 min today →" card on Today pushing `src/app/focus.tsx`. Dashboard shows today's summed focus time. Postponed: Pomodoro presets, end notifications, task linking, ring animation.

**DoD:** background 5 min → correct elapsed; force-kill while running → reopen → timer still running with correct elapsed; multi-pause math correct; saved session shows on dashboard now and after restart; new EAS build; ≥3 real sessions used.

---

## Learning map & checkpoints

- **V0**: Expo tooling, file-based routing (`(tabs)` groups, layouts), TS strict, flexbox dark UI, token discipline. *Implement yourself*: 5 components, FAB overlay, theme. *Checkpoints*: what `(tabs)` parentheses do; layout vs screen routes; why FAB needs no custom tabBar; `bunx expo install` vs `bun add`.
- **V1a**: useReducer + Context + custom hooks, async hydration, controlled forms, modal routes + params, FlatList, derived state/useMemo, local-time date handling, repository boundary. *Implement yourself*: reducers, streak algorithm (paper test cases first), WeekStrip math, repos. *Get shown*: datetimepicker wiring, hydration-flag pattern. *Checkpoints*: why reducers stay pure & where persistence lives; what bug the `isReady` flag prevents; why `dueDate` is a local date string (what breaks at UTC+3); why streaks are derived; when Context consumers re-render and why that's fine here but maybe not in V4; what changes when the React Compiler is turned on after V1a; why delete is a tombstone.
- **V1b**: AppState lifecycle, timestamp-derived state, interval cleanup, discriminated-union state machines. *Checkpoints*: why tick-counters drift; what un-cleaned intervals do; why a union beats optional fields.

## Workflow

- **Git**: `main` always runnable; branches `feat/v0-theme`, `feat/v1a-tasks`, `feat/v1a-habits`, `feat/v1a-today`, `feat/v1b-timer` (one branch per feature instead of a long-lived `dev`); Conventional Commits with **one type per commit** (no "chore + feat" combos), small & runnable; tag `v0`, `v1a`, `v1b`.
- **Testing**: manual `CHECKLIST.md` per feature, run on both platforms before merge, always including "create → kill app → reopen → verify". Automated tests start ~V4 (deliberate).
- **EAS**: run `bunx eas-cli` only when V1a's checklist passes — first build is the V1a shipping ritual, not earlier.
- **Mentorship mode**: James attempts first → asks when stuck → concept + small example → James implements → Claude reviews/debugs. Milestone ends only when the checkpoints can be explained.

## Risks / scope-creep traps

1. Pixel-matching before features work (notched tab bar, mascot art, animated rings) → "structure + tokens + vibe", polish to `BACKLOG.md`.
2. UTC day-key bugs breaking streaks at UTC+3 → single `toDateKey()` helper, `toISOString().slice` banned.
3. Hydration race wiping data → `isReady` flag + obsessive kill/reopen testing from day one.
4. Quantified-habit creep from screenshot badges → hard V1a line: boolean habits; quantified is named V2 work.
5. Premature architecture (Zustand/SQLite/generic repos "because work-brain") → each already has a scheduled version slot.
6. Sync retrofit pain at V9 → `updatedAt` + `deletedAt` tombstones on every entity from V1a.
7. Roadmap too long before the backend (see open questions below) → NestJS is a top learning goal but lands at V8, likely a year+ away.

---

## Roadmap V2–V10 (one-liners, do not design now)

- **V2 — Goals + quantified habits**: goals linked to tasks/habits, milestones, derived progress % as a ring card (screenshot-2 style); habits gain targets/units ("15/20 minutes" badges). *Learn: entity relationships, derived state.*
- **V3 — Analytics**: screenshot-2 dashboard pattern — hero progress-ring card + 2-column stat tiles (focus bar chart with highlighted day, tasks sparkline, trend badges) + **habit-consistency heatmap** (GitHub-style grid, green intensity on dark). **Migrate AsyncStorage → expo-sqlite here.** *Learn: aggregation, date handling, charts.*
- **V4 — Finance**: income/expenses, categories, budgets, monthly summaries (TSh); introduce automated tests. *Learn: complex CRUD, relational thinking.*
- **V5 — Journal**: entries, tags, search, photos via Camera/ImagePicker/FileSystem. *Learn: device APIs, media, offline-first.*
- **V6 — Gamification**: XP, levels, achievements across all features; invest in real mascot art + Reanimated micro-interactions here.
- **V7 — Mini-games**: Memory Match first. *Learn: game state, gestures, performance.*
- **V8 — NestJS backend**: one vertical slice first (Create Habit end-to-end), then module-by-module. *Learn: Nest modules/DI/DTOs, PostgreSQL, migrations.*
- **V9 — Auth + sync**: registration/login, protected routes, then offline sync. *Learn: JWT, guards, sync strategies.*
- **V10 — Testing + CI/CD + production**: GitHub Actions, EAS production builds, Play Store. *Learn: shipping for real.*

### Open roadmap questions (decide at the V1b retro, not now)
- **Earlier NestJS slice?** Build the "Create Habit" end-to-end slice as a side track after V3 instead of waiting for V8, so backend learning starts before six local-only versions pile up.
- **V7 Mini-games optional?** Least connected to the Goals → Habits → Analytics loop; candidate to cut or make a bonus.
- **V4 Finance in or out?** Barely touches the PLAN → TRACK → GAMIFY flow; could be a separate app or move after V8.
- **V3 Stats tab:** added as a 5th tab or replaces Settings (Settings moves behind the avatar)?

## Status & next steps (2026-10-25)

Done: Expo SDK 57 scaffold in `MyApp/` (TS strict, `@/*` alias), `date-fns` / `expo-crypto` / AsyncStorage / `@expo/vector-icons` installed, theme tokens in `src/theme/` (+ `ColorKey` / `PastelKey` types), V0 cleanup (dark mode + splash colour, React Compiler off), ESLint (`eslint-config-expo`), `src/lib/dates.ts` + `src/lib/id.ts`, the 5 base components in `src/components/`, and `(tabs)` layout (Today / Tasks / Habits / Settings, `expo-router/js-tabs`) with the overlay FAB. `tsc`, `expo lint` and an iOS `expo export` bundle are all clean.

Note: V0 code was written by Claude at James's request (exception to mentorship mode), so the checkpoint review below matters more than usual.

Next:
1. Verify on both phones via Expo Go (`bun start`): 4 tabs, FAB clears the home indicator / gesture bar, FAB press logs.
2. Study every file → V0 DoD review with the checkpoints → merge `feat/v0-theme` → tag `v0`.
