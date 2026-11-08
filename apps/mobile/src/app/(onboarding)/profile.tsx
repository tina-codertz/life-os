import { useState } from 'react';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button, Text } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { isApiError } from '@/services/api-error';

// First onboarding step. The real flow (name, time zone, focus areas, first habit) is 5.7.
export default function Profile() {
  const { completeOnboarding, signOut, user } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding();
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  return (
    <PlaceholderScreen
      title={`Welcome${user ? `, ${user.displayName}` : ''}`}
      description="Name, time zone, focus areas and a first habit (5.7)."
    >
      <Button title="Finish onboarding" loading={saving} onPress={() => void finish()} />
      <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
      {error && (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </PlaceholderScreen>
  );
}
