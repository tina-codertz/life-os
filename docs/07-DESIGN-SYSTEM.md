# 07 — Design System

| | |
|---|---|
| **Purpose** | Tokens, components and patterns so screens are composed from one system rather than designed in isolation |
| **Status** | v0.3. **Light playful direction** from the Nov 2026 design export (ADR-020, Confirmed); Outfit font, floating tab bar and platform icons (ADR-021, Proposed); dark variant Proposed. All colours contrast-tested |
| **Last updated** | 2026-11-08 |
| **Related** | [03-User Flows](03-USER-FLOWS.md) · [11-Decisions](11-TECHNICAL-DECISIONS.md) (ADR-020, ADR-021) · design export `docs/Life OS — App Design (1).html` (local only, git-ignored) |

---

## 1. Principles
1. **Light-first, dark-equal.** The design is light. Every component also gets a dark version built from the same roles, and both ship.
2. **Semantic tokens only in components.** Components use `colors.text.secondary`, never `#6B6F7B`.
3. **Soft and friendly.** A pale canvas with a blue wash at the top, white cards with soft shadows, big rounded corners, and pill buttons. Depth comes from shadows in light mode and lighter surfaces in dark mode, not lines.
4. **Ink for action, colour for meaning.** The main action is a near-black "ink" pill. Violet marks links and highlights, pastel tiles group things by meaning (tasks sky, habits lime, focus peach, learning lavender), green means progress only, and red means error or destructive only.
5. **Motion with purpose.** Short (150–250 ms), a slight scale on press, and none under Reduce Motion.

## 2. Color tokens

### 2.1 Where the values come from
The light values are the design export's. Four were darkened slightly because the contrast test failed them:

| Design value | Problem | Used instead |
|---|---|---|
| Success `#1E8A4F` | 3.98:1 on the canvas | `#17784C` |
| Danger text `#D2405B` | 3.58:1 on its own pink tile | `#B42F4A` (fill stays `#C2334B`) |
| Violet `#5A57EE` on lavender (Medium badge) | 4.06:1 | `accent.onSoft` `#4744C9` |
| Muted grey `#6B6F7B` on grey chips `#ECEEF3` | 4.32:1 | grey text is never put on chips or tiles; `text.label` `#4F5560` is used there |

All ratios use the WCAG 2.x relative-luminance formula.

### 2.2 Semantic tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg.canvas` | `#F3F4F9` | `#0F1015` | app background |
| `bg.wash` | `#D3DFEF` | `#1B2233` | the gradient at the top of each screen (`ScreenWash`) |
| `bg.surface` | `#FFFFFF` | `#1A1B23` | cards, inputs, tab bar |
| `bg.elevated` | `#F8F9FC` | `#20212A` | sheets |
| `bg.subtle` | `#ECEEF3` | `#272934` | unselected chips, skeletons |
| `border.subtle` | `#E3E5EC` | `#2C2E3A` | outlines when needed |
| `text.primary` | `#0F0F14` | `#F4F5F9` | |
| `text.secondary` | `#6B6F7B` | `#A0A4B2` | captions; only on canvas / surface / elevated |
| `text.label` | `#4F5560` | `#C2C5D0` | field labels; text on tiles and chips |
| `ink.fill` / `ink.text` | `#0F0F14` / `#FFFFFF` | `#F4F5F9` / `#0F0F14` | primary button, selected chip, current tab |
| `accent.default` | `#5A57EE` | `#A9A6FF` | links, highlights |
| `accent.fill` → `fillEnd` | `#5A57EE` → `#7C5CE8` | same | hero gradient (avatar, quest cards) |
| `accent.soft` / `onSoft` | `#E4E0FB` / `#4744C9` | `#2B2950` / `#C9C7FF` | Medium badge |
| `success.default` / `soft` | `#17784C` / `#DDF1E4` | `#5FD38D` / `#1D3328` | progress only |
| `danger.text` / `fill` / `soft` | `#B42F4A` / `#C2334B` / `#FBDDE2` | `#FF8A9C` / `#C2334B` / `#3D2128` | errors, delete, High badge |
| `reward.fill` / `text` | `#F6C85F` / `#3A2A00` | same | XP and badges (gamification, later) |
| `tile.sky · lime · peach · lavender · rose · neutral` | `#D5E3EA · #E5EFC1 · #FBE2D2 · #E4E0FB · #FBDDE2 · #ECEEF3` | dark tints | icon tiles and chips |
| `category.*` / `categoryTile.*` | strong dot / pastel tile per `CATEGORY_COLORS` | | category chips and task check tiles |

Priority badges: Low = neutral tile + `text.label`, Medium = `accent.soft` + `accent.onSoft`, High = `danger.soft` + `danger.text`, Urgent = `danger.fill` + white. The word is always shown, so priority is never colour alone.

**Implementation:** `apps/mobile/src/theme/` (`colors.ts`, `tokens.ts`, `theme.ts`, `theme-provider.tsx`, one entry point `@/theme`). `ThemeProvider` holds the preference (SYSTEM / DARK / LIGHT) and applies it with `Appearance.setColorScheme`. When the system scheme is unknown, it now falls back to **light**.

**Contrast is tested, not just documented:** `colors.test.ts` checks every text colour on every background, tile and chip, and every label on a fill, against WCAG AA (4.5:1) in both themes. That's 115 checks.

## 3. Typography

**Font: Outfit** (ADR-021), weights 400 / 500 / 600 / 700 loaded with `expo-font` before the splash screen hides. Each style names its font file (`fonts.*` in `tokens.ts`), because Android can't make a bold from the regular file.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `hero` | 48 / 52, −2 tracking | 700 | Welcome "Life OS" |
| `display` | 34 / 38, −1 | 700 | Screen titles ("Tasks", "Welcome back") |
| `title1` | 26 / 30, −0.6 | 700 | Sheet titles ("New task") |
| `title2` | 22 / 28, −0.5 | 700 | Names, section heads |
| `title3` | 18 / 24 | 700 | Card titles, empty / error titles |
| `body` | 16 / 22 | 500 | Default |
| `bodyStrong` | 16 / 22 | 600 | Row titles, button labels |
| `callout` / `calloutStrong` | 15 / 20 | 500 / 600 | Row values / chips, tabs |
| `label` | 14 / 18 | 600 | Field labels, small buttons |
| `caption` | 13 / 18 | 400 | Meta ("Tomorrow · Work") |
| `overline` | 13 / 16, +1, uppercase | 700 | Group labels |

All text goes through `<Text variant tone>`. Font scaling is allowed up to 2×, and layouts wrap.

## 4. Spacing, radius, elevation

- **Spacing (4-pt):** `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · gutter 20 · xl 24 · xxl 32 · xxxl 48`. Screen gutter = `gutter` (20), as in the design.
- **Radius:** `sm 10` (badges) · `md 14` (icon tiles) · `lg 22` (inputs, task rows) · `xl 26` (cards, list groups) · `sheet 34` · `full` (buttons, chips, tab bar, avatars).
- **Elevation (light):** `sm` `0 6px 16px rgba(40,50,90,.10)` (inputs, round buttons) · `md` `0 12px 32px rgba(40,50,90,.10)` (cards) · `lg` `0 12px 32px rgba(40,50,90,.16)` (tab bar, floating +). Dark: lighter surfaces, with a shadow only on `lg`.
- **Touch target:** ≥ 44×44 pt (40 pt chips and small buttons get `hitSlop`).

## 5. Component inventory

Primitives live in `src/components/ui/`, and feature components in `src/features/*/components/`. **Built in 5.1:** `Text`, `Button`, `Card`; **5.5:** `TextField` (label, error/helper read by screen readers, Show/Hide for passwords); **5.6:** `OfflineBanner` (pill under the status bar, announced, doesn't block taps); **5.8:** `Toast` (+ `useToast`, one at a time, 5 s, optional action, announced), `EmptyState`, `ErrorState` (plain-language message per error type, request ID to quote, retry), `Skeleton` / `SkeletonGroup` (after 150 ms, pulse off under Reduce Motion, hidden from screen readers, group announced as loading), native sheets. Motion uses React Native's `Animated` (opacity/transform on the native thread) and `useReducedMotion()` from `@/theme`; Reanimated is kept for gesture-heavy work later (Phase 6 swipe actions). **6.1:** `Chip` (radio / checkbox role, selected state announced, optional colour dot) and the category palette `colors.category.*` (≥ 3:1 on every surface, tested). **Design refresh (Nov 2026, ADR-020/021):** every primitive restyled, plus `Icon` (one map of SF Symbol / Material Symbol names), `IconTile`, `IconButton` (round white, or ink for the floating +), `ListGroup` / `ListRow` (settings-style rows), `SegmentedControl` (announced as tabs), `Mascot` (Lio, 6 moods; decorative or labelled), and app-level `Screen` / `ScreenHeader` / `ScreenWash`, `FormScreen` (with the Life OS logo row), `TabBar` (floating dock), `StepDots` (onboarding) and `MonthCalendar` (the due-date picker).

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
| `BottomSheet` | snap points | **Decided in 5.8: native form sheets** presented as routes (`sheetOptions()` in `src/components/sheet.ts`: `presentation: 'formSheet'`, grabber, detents), not `@gorhom/bottom-sheet`: the platform's own sheet, no JS look-alike |
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
- Icons: **SF Symbols on iOS, Material Symbols on Android** via `expo-symbols` (ADR-021), named by meaning in `components/ui/icon.tsx` (e.g. `calendar`, `tasks`, `flame`). They're close to the design's Lucide line icons and look native on each platform. Icons are decorative, so the button or row around them carries the label.
- 20 pt default in rows and buttons, 17–24 pt in tiles.
- **Lio the mascot** (`assets/mascot/`, from the design export): happy (welcome, sign-in logo), sleepy (empty states), planning ("coming soon"), excited, focused and celebrating (for later: focus timer, rewards). Marked decorative wherever the text beside it already says everything.
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
