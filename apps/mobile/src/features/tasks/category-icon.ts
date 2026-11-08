import type { IconName } from '@/components/ui';

// Categories store a Lucide icon name (from onboarding's focus areas); this maps the ones the
// app offers to its own icon names. Anything else shows the tasks icon.
const BY_NAME: Record<string, IconName> = {
  briefcase: 'briefcase',
  'book-open': 'book',
  'heart-pulse': 'health',
  user: 'person',
  wallet: 'wallet',
  house: 'home',
};

export function categoryIcon(name: string | null | undefined): IconName {
  return (name && BY_NAME[name]) || 'tasks';
}
