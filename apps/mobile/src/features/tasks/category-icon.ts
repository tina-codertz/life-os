import type { IconName } from '@/components/ui';
import { FOCUS_AREAS } from '@/features/onboarding/focus-areas';

// Categories store a Lucide icon name (from onboarding's focus areas); this maps them to the
// app's own icon names, built from that one list so a new focus area can't be forgotten here.
// Anything else shows the tasks icon.
const BY_NAME = new Map<string, IconName>(FOCUS_AREAS.map((area) => [area.icon, area.glyph]));

export function categoryIcon(name: string | null | undefined): IconName {
  return (name && BY_NAME.get(name)) || 'tasks';
}
