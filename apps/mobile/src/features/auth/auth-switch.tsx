import { router } from 'expo-router';
import { SegmentedControl } from '@/components/ui';

const OPTIONS = [
  { value: 'login', label: 'Sign in' },
  { value: 'register', label: 'Create account' },
] as const;

// The Sign in | Create account switch from the design. Each side is its own route, so the
// back gesture and deep links (/login, /register) keep working; switching replaces the screen.
export function AuthSwitch({ current }: { current: 'login' | 'register' }) {
  return (
    <SegmentedControl
      accessibilityLabel="Sign in or create an account"
      options={OPTIONS}
      value={current}
      onChange={(value) => router.replace(value === 'login' ? '/login' : '/register')}
    />
  );
}
