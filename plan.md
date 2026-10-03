# MyLife — Product & Build Plan (V0 → V1, roadmap to V10)

## Context

James is building **MyLife**, a personal "life operating system" mobile app — daily dashboard, tasks, habits, focus time, and later goals, analytics, finance, journal, gamification, and mini-games. It is simultaneously a real app he will daily-drive and a deliberate long-term learning project for **React Native + Expo** (and later **NestJS + PostgreSQL**). His day job uses Flutter/Django; this project is dedicated RN/Node practice.

Guiding principle (non-negotiable): **BUILD SMALL → USE IT → LEARN → EXPAND → SHIP.** Claude acts as mentor/reviewer; James writes the code — no big generated code dumps.

## Decisions made (with James, 2026-10-03)

| Decision | Choice |
|---|---|
| Stack | React Native + Expo (Expo Router, TypeScript strict); NestJS + PostgreSQL deferred to V8 |
| V1 split | **V1a** = Today dashboard + Tasks + Habits (streaks, weekly history); **V1b** = Focus timer. Ship & daily-drive V1a first |
| Design | Full screenshot style from day one; simple mascot (emoji/free illustration), custom art later (V6) |
| Storage | AsyncStorage (JSON) behind a repository layer; migrate to expo-sqlite at V3 as a deliberate lesson |
| Platform | Cross-platform dev via Expo Go; primary install target decided at the V1a EAS-build milestone |

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
- Navigation: 4 tabs (Home, Stats, Check-ins, Settings) + raised green center FAB. Empty states: mascot + single CTA.

---

## V0 — Foundation (~1 week of evenings)

### Setup
```bash
cd ~/Mobile_Apps/personal-app
npx create-expo-app@latest . --template default   # TS + expo-router + tabs example
npm run reset-project && rm -rf app-example
npx expo install expo-crypto @react-native-async-storage/async-storage
npm install date-fns
git init && git commit -m "chore: scaffold Expo app"
```
Packages: `expo-router` (bundled), `date-fns` v4 (pure functions > dayjs chaining for learning), `expo-crypto` for `Crypto.randomUUID()`, `@expo/vector-icons` (Ionicons). **Reanimated ships in the template but is not used until V2+.** Postponed: Zustand/Redux, SQLite, notifications, haptics, custom fonts.

### Folder structure (minimal — no empty feature dirs)
```
app/                      # ROUTES ONLY, thin files (<~30 lines)
├── _layout.tsx           # root Stack + providers
└── (tabs)/_layout.tsx + index.tsx (Today) + stats.tsx + habits.tsx + settings.tsx
src/
├── theme/                # colors.ts, spacing.ts, typography.ts
├── components/           # the 5 base components
└── lib/                  # dates.ts (toDateKey/todayKey), id.ts
```
`src/features/` and `src/storage/` appear in V1a when the first feature needs them.

### Theme tokens (sampled from screenshot 1; dark-only)
`bg #0E0E12 · surface #1C1C22 · surfaceRaised #26262E · textPrimary #FFF · textSecondary #8E8E96 · accentGreen #8FB339 · accentRed #D9475F · pastels: pink #F2A69B, lavender #B6B3E8, lilac #E8B5D8, blue #BFD9EE, green #CDE7A6`. Radius: cards 20–24, pills 999. Typography variants: title 24/bold, heading 18/semibold, body 15, caption 12/muted. **Rule: no hex literals outside `src/theme/`; habit colors stored as token keys (`'pastelPink'`), not hex — survives DB migrations.**

### Base components — exactly five
`Screen` (SafeArea + bg + padding) · `AppText` (variant prop) · `Card` (surface, radius 20, optional Pressable) · `Button` (primary red pill / ghost) · `IconTile` (pastel rounded square + emoji). Week strip, badges, etc. are built inside features in V1a and promoted only when reused.

### Tabs + FAB
Expo Router `<Tabs>` with 4 screens, no labels, dark `tabBarStyle`, red active tint. **FAB = absolutely positioned `Pressable` sibling overlaying the `<Tabs>`** in `(tabs)/_layout.tsx` (green circle, bottom ≈36, centered) — NOT a dummy fifth tab, NOT a custom tabBar. The notched/curved bar is a backlog polish item.

### V0 Definition of Done
- Runs in Expo Go on both iOS and Android devices
- 4 dark tabs + floating green FAB (logs press); each placeholder screen exercises the 5-component kit
- No hex colors outside theme; ≥4 meaningful conventional commits; James can explain every file

---

## V1a — Today + Tasks + Habits (~2–4 weeks of evenings)

### Data model (UUID string PKs, ISO strings — survives SQLite/PostgreSQL later)
```ts
Task  { id, title, notes?, dueDate: 'YYYY-MM-DD'|null, priority: 'low'|'medium'|'high',
        completedAt: ISO|null /* doubles as done flag */, createdAt, updatedAt }
Habit { id, title, icon /* emoji */, color: PastelKey, timeOfDay: 'morning'|'afternoon'|'allday',
        createdAt, archivedAt: ISO|null /* soft delete preserves history */ }
HabitCompletion { id, habitId, date: 'YYYY-MM-DD' /* LOCAL day key */, completedAt: ISO }
```

### Storage (`src/storage/`)
`storage.ts` is the **only** file importing AsyncStorage: `readCollection<T>(key)` / `writeCollection<T>(key, items)`. Versioned keys: `mylife.tasks.v1`, `mylife.habits.v1`, `mylife.habitCompletions.v1`. Per-entity repos expose only `getAll`/`saveAll` (whole-collection; reducers own mutation logic). At V3 only the repos change.

### State: React Context + useReducer (not Zustand — deliberately)
Zustand would be less code, but Context + reducer teaches the primitives Zustand builds on; migrate later when re-renders actually hurt (V3–V4) as a motivated lesson. One provider per domain: `TasksProvider`, `HabitsProvider` (habits + completions share a reducer since streaks need both), mounted in `app/_layout.tsx`, consumed via `useTasks()`/`useHabits()` hooks. **Persistence pattern:** pure reducer; provider `useEffect` saves after state changes, gated by an `isReady` hydration flag (hydrate on mount → `dispatch({type:'hydrated'})`) so an empty array never overwrites stored data.

### Streaks: derive, don't store
Build a `Set` of completion date-keys; start from today **or yesterday if today isn't done yet** (streak isn't broken until the day ends); walk back with `subDays` counting hits. Derived = one source of truth, powers weekly history and V3 analytics for free; `useMemo` if it ever matters. **Timezone rule (Tanzania = UTC+3): all day keys via one `toDateKey()` helper using `format(d,'yyyy-MM-dd')` — `toISOString().slice(0,10)` is banned (UTC would mis-date pre-3am check-ins and break streaks).**

### Build order
1. **Tasks end-to-end first** (simplest entity, proves pipeline: types → repo → provider → UI → persistence). Create/edit via modal route `app/task-form.tsx` (`presentation:'modal'`, `useLocalSearchParams` for edit). Form: title, notes, priority pills, due date ("Today / Tomorrow / Pick date" + `@react-native-community/datetimepicker`). Complete = tap circle; delete = long-press + Alert confirm (swipe postponed).
2. **Habits**: form modal (title, emoji via TextInput — custom emoji grid is a trap, color = 5 pastel swatches, timeOfDay pills). Habit card per screenshot 1: IconTile + title + streak pill badge; tap toggles today's completion. **Weekly history**: 7 dots (Mon–Sun) filled from the completion Set.
3. **Today screen** (integration): date header + avatar tile; **week strip** (`startOfWeek` weekStartsOn:1, selected day = green circle; tapping past days shows that day's habits read-only; multi-week scroll postponed); greeting by hour; All Day/Morning/Afternoon segmented filter; Tasks section (today + overdue, top 5, "See all"); Habits section; **"Your Progress" card with text %** (ring = stretch); mascot empty state (🌙 + emoji/free illustration + red "Create habit" button); FAB opens "New task / New habit" chooser.

### V1a Definition of Done (= verification)
- Task CRUD + complete; habit CRUD + daily check-off; **all data survives full app kill/restart**
- Streak correct across: consecutive days, missed day, first completion, un-checking today
- Weekly dots match reality; Today screen matches reference structure incl. progress card and empty state
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
Elapsed = `accumulatedMs + (Date.now() − startedAt)`; the 1s `setInterval` only re-renders the clock (cleared on unmount). `AppState` return-to-active is automatically correct because elapsed is derived — that's the lesson. `useKeepAwake()` on the timer screen. Stop → confirm → save via `focusRepo` (`mylife.focusSessions.v1`); discard <60s. UI: big time display, green Start/red Stop pills; entry = "Focus · 45 min today →" card on Today pushing `app/focus.tsx`. Dashboard shows today's summed focus time. Postponed: Pomodoro presets, end notifications, task linking, ring animation.

**DoD:** background 5 min → correct elapsed; multi-pause math correct; saved session shows on dashboard now and after restart; new EAS build; ≥3 real sessions used.

---

## Learning map & checkpoints

- **V0**: Expo tooling, file-based routing (`(tabs)` groups, layouts), TS strict, flexbox dark UI, token discipline. *Implement yourself*: 5 components, FAB overlay, theme. *Checkpoints*: what `(tabs)` parentheses do; layout vs screen routes; why FAB needs no custom tabBar; `npx expo install` vs `npm install`.
- **V1a**: useReducer + Context + custom hooks, async hydration, controlled forms, modal routes + params, FlatList, derived state/useMemo, local-time date handling, repository boundary. *Implement yourself*: reducers, streak algorithm (paper test cases first), WeekStrip math, repos. *Get shown*: datetimepicker wiring, hydration-flag pattern. *Checkpoints*: why reducers stay pure & where persistence lives; what bug the `isReady` flag prevents; why `dueDate` is a local date string (what breaks at UTC+3); why streaks are derived; when Context consumers re-render and why that's fine here but maybe not in V4.
- **V1b**: AppState lifecycle, timestamp-derived state, interval cleanup, discriminated-union state machines. *Checkpoints*: why tick-counters drift; what un-cleaned intervals do; why a union beats optional fields.

## Workflow

- **Git**: `main` always runnable; branches `feat/v0-theme`, `feat/v1a-tasks`, `feat/v1a-habits`, `feat/v1a-today`, `feat/v1b-timer`; Conventional Commits, small & runnable; tag `v0`, `v1a`, `v1b`.
- **Testing**: manual `CHECKLIST.md` per feature, run on both platforms before merge, always including "create → kill app → reopen → verify". Automated tests start ~V4 (deliberate).
- **EAS**: install `eas-cli` only when V1a's checklist passes — first build is the V1a shipping ritual, not earlier.
- **Mentorship mode**: James attempts first → asks when stuck → concept + small example → James implements → Claude reviews/debugs. Milestone ends only when the checkpoints can be explained.

## Risks / scope-creep traps

1. Pixel-matching before features work (notched tab bar, mascot art, animated rings) → "structure + tokens + vibe", polish to `BACKLOG.md`.
2. UTC day-key bugs breaking streaks at UTC+3 → single `toDateKey()` helper, `toISOString().slice` banned.
3. Hydration race wiping data → `isReady` flag + obsessive kill/reopen testing from day one.
4. Quantified-habit creep from screenshot badges → hard V1a line: boolean habits; quantified is named V2 work.
5. Premature architecture (Zustand/SQLite/generic repos "because work-brain") → each already has a scheduled version slot.

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

## First implementation steps (when approved)

1. Copy this plan into the repo's `plan.md` (replacing the empty file).
2. V0 setup commands above; verify on both phones via Expo Go.
3. Theme tokens → 5 base components → tabs + FAB → V0 DoD review with checkpoints.
