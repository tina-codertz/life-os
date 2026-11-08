import type { CreateHabitInput } from '@life-os/shared';
import type { IconName } from '@/components/ui';

// FR-ONB-003: a first habit from a template (onboarding's last, optional step).
export const HABIT_TEMPLATES = [
  {
    key: 'read',
    label: 'Read 20 min',
    glyph: 'book',
    habit: {
      name: 'Read 20 min',
      icon: 'book-open',
      color: 'violet',
      schedule: { frequency: 'DAILY' },
    },
  },
  {
    key: 'workout',
    label: 'Workout',
    glyph: 'dumbbell',
    habit: {
      name: 'Workout',
      icon: 'dumbbell',
      color: 'orange',
      schedule: { frequency: 'WEEKLY_DAYS', weekdays: [1, 3, 5] },
    },
  },
  {
    key: 'water',
    label: 'Drink water',
    glyph: 'droplet',
    habit: {
      name: 'Drink water',
      icon: 'droplet',
      color: 'blue',
      targetCount: 8,
      unit: 'glasses',
      schedule: { frequency: 'DAILY' },
    },
  },
  {
    key: 'meditate',
    label: 'Meditate',
    glyph: 'brain',
    habit: { name: 'Meditate', icon: 'brain', color: 'teal', schedule: { frequency: 'DAILY' } },
  },
  {
    key: 'walk',
    label: 'Walk',
    glyph: 'footprints',
    habit: { name: 'Walk', icon: 'footprints', color: 'green', schedule: { frequency: 'DAILY' } },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  glyph: IconName;
  habit: CreateHabitInput;
}[];

export type HabitTemplateKey = (typeof HABIT_TEMPLATES)[number]['key'];
