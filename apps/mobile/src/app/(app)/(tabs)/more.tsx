import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/features/auth/session';

export default function More() {
  const { signOut } = useSession();
  return (
    <PlaceholderScreen title="More" description="Goals and settings (Phase 6).">
      <Button
        title="Design system"
        variant="secondary"
        onPress={() => router.push('/design-preview')}
      />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </PlaceholderScreen>
  );
}
