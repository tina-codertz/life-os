import { router } from 'expo-router';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button, Card, ErrorState, Skeleton, SkeletonGroup, Text } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useMe } from '@/features/users/queries';

export default function More() {
  const { signOut } = useSession();
  const me = useMe();

  return (
    <PlaceholderScreen title="More" description="Goals and settings come in Phase 6.">
      <AccountCard me={me} />
      <Button
        title="Design system"
        variant="secondary"
        onPress={() => router.push('/design-preview')}
      />
      <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
    </PlaceholderScreen>
  );
}

// The four states of loaded data (docs/07 §6): loading, error, content, and content with a
// failed refresh. Cached data stays on screen when a refresh fails or the phone is offline.
function AccountCard({ me }: { me: ReturnType<typeof useMe> }) {
  if (me.data === undefined) {
    if (me.error) {
      return (
        <Card>
          <ErrorState error={me.error} onRetry={() => void me.refetch()} retrying={me.isFetching} />
        </Card>
      );
    }
    if (me.fetchStatus === 'paused') {
      return (
        <Card>
          <Text tone="secondary">Waiting for a connection…</Text>
        </Card>
      );
    }
    return (
      <Card>
        <SkeletonGroup label="Loading your account">
          <Skeleton width="50%" height={22} />
          <Skeleton width="70%" />
          <Skeleton width="40%" height={12} />
        </SkeletonGroup>
      </Card>
    );
  }

  const { user, settings } = me.data;
  return (
    <Card>
      <Text variant="title3">{user.displayName}</Text>
      <Text tone="secondary">{user.email}</Text>
      <Text variant="caption" tone="secondary">
        Theme {settings.theme.toLowerCase()} · time zone {settings.timezone}
      </Text>
      <Text variant="caption" tone="secondary">
        Updated {new Date(me.dataUpdatedAt).toLocaleTimeString()}
        {me.error ? ' · refresh failed, showing saved data' : ''}
      </Text>
    </Card>
  );
}
