import type { CategoryColor } from '@life-os/shared';
import type { IconName } from '@/components/ui';

// FR-ONB-002: the areas offered in onboarding. Each one chosen becomes a task category, with a
// palette colour (its pastel is the chip colour, as in the design's Work / Learning / Personal
// chips) and an icon name from the design's icon set, stored on the category.
export const FOCUS_AREAS = [
  { key: 'work', name: 'Work', color: 'blue', icon: 'briefcase', glyph: 'briefcase' },
  { key: 'learning', name: 'Learning', color: 'violet', icon: 'book-open', glyph: 'book' },
  { key: 'health', name: 'Health', color: 'green', icon: 'heart-pulse', glyph: 'health' },
  { key: 'personal', name: 'Personal', color: 'orange', icon: 'user', glyph: 'person' },
  { key: 'money', name: 'Money', color: 'amber', icon: 'wallet', glyph: 'wallet' },
  { key: 'home', name: 'Home', color: 'teal', icon: 'house', glyph: 'home' },
] as const satisfies readonly {
  key: string;
  name: string;
  color: CategoryColor;
  icon: string;
  glyph: IconName;
}[];

export type FocusAreaKey = (typeof FOCUS_AREAS)[number]['key'];

export const MAX_FOCUS_AREAS = 3;
