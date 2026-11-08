import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/features/auth/session';

// First onboarding step. The real flow (name, time zone, focus areas, first habit) is 5.7.
export default function Profile() {
  const { completeOnboarding, signOut } = useSession();
  return (
    <PlaceholderScreen
      title="Welcome"
      description="Name, time zone, focus areas and a first habit (5.7)."
    >
      <Button title="Finish onboarding" onPress={completeOnboarding} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </PlaceholderScreen>
  );
}
