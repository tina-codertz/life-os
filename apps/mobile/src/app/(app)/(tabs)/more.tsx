import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/features/auth/session';

export default function More() {
  const { signOut, user } = useSession();
  return (
    <PlaceholderScreen
      title="More"
      description={`Signed in as ${user?.email ?? '…'}. Goals and settings come in Phase 6.`}
    >
      <Button
        title="Design system"
        variant="secondary"
        onPress={() => router.push('/design-preview')}
      />
      <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
    </PlaceholderScreen>
  );
}
