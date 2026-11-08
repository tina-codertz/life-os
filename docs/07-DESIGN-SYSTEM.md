# 07 — Design System

| | |
|---|---|
| **Purpose** | Tokens, components and patterns so screens are composed from one system rather than designed in isolation |
| **Status** | v0.2. Accent direction **Confirmed** (violet/indigo); colour values implemented in 5.1 and contrast-tested (two dark reds adjusted); Inter font still **Proposed** (system font for now) |
| **Last updated** | 2026-11-03 |
| **Related** | [03-User Flows](03-USER-FLOWS.md) · [11-Decisions](11-TECHNICAL-DECISIONS.md) (ADR-007) |

---

## 1. Principles
1. **Dark-first, light-equal.** Design in dark, then verify every component in light. Both ship in MVP.
2. **Semantic tokens only in components.** Components use `colors.text.secondary`, never `#8E8E96`.
3. **Hierarchy through surfaces, not lines.** Layered surfaces (background → surface → elevated) replace most borders.
4. **One accent.** Violet means "primary action / brand". Green means *progress/success only*. Red means *error/destructive only*.
5. **Motion with purpose.** Short (150–250 ms) and disabled under Reduce Motion.

## 2. Color tokens

### 2.1 Palette review
| Brief value | Verdict |
|---|---|
| Background `#0E0E12`, Surface `#1C1C22`, Elevated `#26262E` | ✅ keep, good layering |
| Primary text `#FFFFFF` | ✅ 19.3:1 on background. Use `#F5F5F7` for long text to reduce glare (Proposed) |
| Secondary text `#8E8E96` | ⚠️ passes AA on bg (5.9) and surface (5.2), but only 4.6 on elevated. Bump to `#9A9AA3` (5.4 on elevated) |
| Accent `#8FB339` (green) | 🔁 moved to the **success** role (7.0:1 on surface). Brand accent becomes violet (Confirmed) |
| Error `#D9475F` | ⚠️ 4.05:1 on surface, which fails AA for text. Use `#E5566E` for text on dark (4.75); keep `#D9475F` for fills |

All ratios were computed with the WCAG 2.x relative-luminance formula.

### 2.2 Semantic tokens

| Token | Dark | Light | Notes / contrast |
|---|---|---|---|
| `bg.canvas` | `#0E0E12` | `#F7F7FA` | |
| `bg.surface` | `#1C1C22` | `#FFFFFF` | cards |
| `bg.elevated` | `#26262E` | `#FFFFFF` + shadow | sheets, menus |
| `bg.subtle` | `#16161B` | `#EFEFF4` | inputs, chips |
| `border.subtle` | `#2E2E37` | `#E3E3EA` | dividers when needed |
| `text.primary` | `#F5F5F7` | `#0E0E12` | 18:1 / 18:1 |
| `text.secondary` | `#9A9AA3` | `#5E5E68` | ≥ 5.4 / 6.0 |
| `text.inverse` | `#0E0E12` | `#FFFFFF` | |
| `accent.default` | `#8B7CFF` | `#5B3FE0` | text/icons: 5.2 on surface / 6.1 on canvas |
| `accent.fill` | `#6D4EF2` | `#5B3FE0` | button bg; white label 5.2 / 6.5 |
| `accent.soft` | `rgba(139,124,255,0.16)` | `rgba(91,63,224,0.10)` | selected chips, progress track |
| `success.default` | `#8FB339` | `#17784C` | progress, streaks: 7.0 / 5.5 |
| `success.soft` | `rgba(143,179,57,0.16)` | `rgba(23,120,76,0.10)` | |
| `danger.text` | `#EA6479` | `#C2334B` | ≥ 4.72 on every dark background (was `#E5566E`: 4.21 on elevated) / 5.4 |
| `danger.fill` | `#C2334B` | `#C2334B` | destructive buttons; white label 5.43 (dark was `#D9475F`: 4.19, fails AA) |
| `warning.default` | `#F5B544` | `#9A6200` | budget 80% alert: 9.4 / 5.1 |
| `priority.urgent/high/medium/low` | danger / warning / accent / text.secondary | same mapping | always paired with an icon or label, never color alone |

**Implementation (5.1):** `apps/mobile/src/theme/` (`colors.ts`, `tokens.ts`, `theme.ts`, `theme-provider.tsx`, one entry point `@/theme`). `darkTheme` and `lightTheme` have the same shape (`text.onAccent` added for labels on fills). `ThemeProvider` holds the preference (SYSTEM / DARK / LIGHT, the shared `THEMES`) and applies it with `Appearance.setColorScheme`, so native UI (status bar, keyboard, alerts) follows too; `useTheme()` returns the active theme. Until settings sync (5.6/5.7) the preference lives in memory.

**Contrast is tested, not just documented:** `colors.test.ts` checks every text colour on every background, and labels on fills, against WCAG AA (4.5:1) in both themes. It caught the two dark-mode reds above.

## 3. Typography

**Proposed font:** Inter (via `expo-font`), with SF/Roboto as fallback. Numerals use `fontVariant: ['tabular-nums']` for stats and money.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 34 / 40 | 700 | Today greeting, big numbers |
| `title1` | 28 / 34 | 700 | Screen titles |
| `title2` | 22 / 28 | 600 | Section headers |
| `title3` | 18 / 24 | 600 | Card titles |
| `body` | 16 / 22 | 400 | Default |
| `bodyStrong` | 16 / 22 | 600 | List item titles |
| `callout` | 14 / 20 | 400 | Secondary info |
| `caption` | 12 / 16 | 500 | Meta, labels |
| `overline` | 11 / 14 | 600, +0.5 tracking, uppercase | Group labels |

All text goes through a `<Text variant="body" tone="secondary">` primitive. Font scaling is allowed (`maxFontSizeMultiplier` 2.0), and layouts must wrap rather than truncate critical info.

## 4. Spacing, radius, elevation

- **Spacing (4-pt):** `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48`. Screen gutter = `lg` (16).
- **Radius:** `sm 8` (chips, inputs) · `md 12` (buttons) · `lg 16` (cards) · `xl 24` (sheets) · `full` (avatars, check circles).
- **Elevation:**
  - Dark: elevation = lighter surface (`bg.elevated`), shadows nearly invisible.
  - Light: `shadow.sm` (y1 blur3 8% black), `shadow.md` (y4 blur12 10%), `shadow.lg` (y8 blur24 12%).
- **Touch target:** ≥ 44×44 pt (use `hitSlop` for small icons).

## 5. Component inventory

Primitives live in `src/components/ui/`, and feature components in `src/features/*/components/`. **Built in 5.1:** `Text`, `Button`, `Card`; **5.5:** `TextField` (label, error/helper read by screen readers, Show/Hide for passwords); **5.6:** `OfflineBanner` (pill under the status bar, announced, doesn't block taps). The rest in 5.8.

| Component | Variants / props | States |
|---|---|---|
| `Text` | variant, tone (primary/secondary/accent/success/danger) | — |
| `Button` | `primary` · `secondary` · `ghost` · `destructive`; sizes `sm/md/lg`; `icon`, `loading` | default, pressed, disabled, loading |
| `IconButton` | size, tone | pressed, disabled |
| `Card` | `surface` · `elevated` · `outlined`; `onPress?` | pressed |
| `ListItem` | leading, title, subtitle, trailing, swipe actions | pressed, swiping |
| `TextField` | label, helper, error, leading icon, multiline | focus, error, disabled |
| `Select` / `Picker` | single/multi (bottom-sheet based) | |
| `DateTimePicker` | date, time, date+time | |
| `Chip` | filter / choice / input; color dot | selected |
| `Checkbox` / `CheckCircle` | task / habit style; `progress` for count habits | unchecked, checked (animated), partial |
| `Switch` | | |
| `SegmentedControl` | Day/Week/Month | |
| `ProgressRing` | size, value, tone | animated |
| `ProgressBar` | value, tone | |
| `StreakBadge` | count, flame icon | active, broken |
| `HabitHeatmap` | weeks, data | done / missed / unscheduled / future |
| `BottomSheet` | snap points | (library: `@gorhom/bottom-sheet`, Proposed) |
| `Dialog` / `ConfirmDialog` | destructive flag | |
| `Toast` | info / success / error, action | |
| `EmptyState` | icon, title, description, CTA | |
| `ErrorState` | message, onRetry | |
| `Skeleton` | shapes: line, circle, card | shimmer (off under Reduce Motion) |
| `OfflineBanner` | | |
| `Fab` | with action sheet | |
| `TabBar` | custom Expo Router tab bar, 5 items | active, badge |
| `ScreenHeader` | title, large title, actions | collapsed on scroll |
| `Avatar` | initials fallback | |

**Feature components (examples):** `TaskRow`, `TaskForm`, `HabitRow`, `HabitForm`, `GoalCard`, `MilestoneList`, `EventBlock`, `TodayProgressCard`, `PrioritiesCard`.

## 6. State patterns

| State | Rule |
|---|---|
| Loading | Skeleton matching the final layout. Show it only after 150 ms (avoids flicker). Keep stale data visible while refetching |
| Empty | `EmptyState` with a contextual CTA ("Add your first habit"). Filtered-empty gets a different message + "Clear filters" |
| Error | `ErrorState` inline with Retry. Never a blank screen. Offline → `OfflineBanner` + cached data |
| Success feedback | Haptic `light` on check, `success` on completing all of today's items. Subtle check animation |
| Destructive | `ConfirmDialog` + undo toast (5 s) for soft-deletes |

## 7. Accessibility checklist
- Contrast per §2 (AA, both themes); non-text UI elements ≥ 3:1.
- `accessibilityRole`, `accessibilityLabel`, `accessibilityState` (e.g. `{ checked }`) on every interactive element.
- Habit check: label "Drink water, 3 of 8, not completed. Double-tap to log one."
- Never rely on color alone (priority = color + icon/label; heatmap uses shape or pattern for missed).
- Respect `AccessibilityInfo.isReduceMotionEnabled`.
- Focus order follows the visual order; modals trap focus.
- Test with VoiceOver and TalkBack before each release (see [09](09-TESTING-STRATEGY.md)).

## 8. Layout & responsiveness
- Phones are the primary target, from 360 pt wide (small Android) up. Use flexible widths, no fixed pixel layouts.
- Respect safe areas (`react-native-safe-area-context`).
- Tablets: max content width 640 pt, centered (MVP). Two-column layouts are deferred.
- Landscape: supported for Calendar week view only (Proposed). Other screens stay portrait.

## 9. Iconography & imagery
- One icon set: **Lucide** (`lucide-react-native`) *(Proposed: consistent stroke style, tree-shakeable)*.
- 24 pt default, 1.75 stroke.
- Category/habit icons are chosen from a curated subset (~60), with the stored name validated server-side.

## 10. Inspiration references (from brief)
- Personal Finance Budget Dashboard: https://dribbble.com/shots/27190292
- HabitBe: https://habitbe.app/
- Mobile Calendar App: https://dribbble.com/shots/20039005
- Smart Productivity / Daily Planner: https://dribbble.com/shots/27218746
- Habit Tracker App: https://dribbble.com/shots/18640807
- Remindion: https://remindion.com/
- To-Do Pro Dark Mode: https://dribbble.com/shots/24729957
- Xified: https://systembionic.com/xified

## 11. Phase 2 deliverables (design work still to do)
- [ ] Token file reviewed and frozen (v1)
- [ ] Low-fi wireframes: Today, Tasks, Habits, Calendar, Goals, Onboarding
- [ ] Hi-fi of Today + one list + one form in **both themes**
- [ ] Component sheet (all states) in Figma
- [ ] Empty/error/loading designs for each MVP screen
