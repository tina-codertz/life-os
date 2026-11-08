import { router } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/screen';
import {
  Card,
  ErrorState,
  ListGroup,
  ListRow,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useMe } from '@/features/users/queries';
import { radius, spacing, useTheme } from '@/theme';

const THEME_LABEL = { SYSTEM: 'Match phone', DARK: 'Dark', LIGHT: 'Light' } as const;

// The design's Settings screen: profile card, then preferences, then account actions. Only
// rows that work today are shown; Goals, Insights, export and delete arrive with their phases.
export default function More() {
  const { signOut } = useSession();
  const { colors } = useTheme();
  const me = useMe();
  const settings = me.data?.settings;

  return (
    <Screen title="More" subtitle="Profile and preferences">
      <AccountCard me={me} />
      {settings && (
        <ListGroup>
          <ListRow
            icon="palette"
            tint={colors.tile.lavender}
            title="Appearance"
            value={THEME_LABEL[settings.theme]}
          />
          <ListRow
            icon="globe"
            tint={colors.tile.lime}
            title="Time zone"
            value={settings.timezone.split('/').at(-1)?.replaceAll('_', ' ') ?? settings.timezone}
          />
        </ListGroup>
      )}
      <ListGroup>
        {__DEV__ && (
          <ListRow
            icon="palette"
            tint={colors.tile.sky}
            title="Design system"
            onPress={() => router.push('/design-preview')}
          />
        )}
        <ListRow icon="signOut" title="Sign out" tone="danger" onPress={() => void signOut()} />
      </ListGroup>
    </Screen>
  );
}

// The four states of loaded data (docs/07 §6): loading, error, content, and content with a
// failed refresh. Cached data stays on screen when a refresh fails or the phone is offline.
function AccountCard({ me }: { me: ReturnType<typeof useMe> }) {
  const { colors } = useTheme();
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
          <Skeleton shape="circle" height={62} />
          <Skeleton width="50%" height={20} />
          <Skeleton width="70%" />
        </SkeletonGroup>
      </Card>
    );
  }

  const { user } = me.data;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 62,
            height: 62,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `linear-gradient(135deg, ${colors.accent.fill}, ${colors.accent.fillEnd})`,
          }}
        >
          <Text variant="title1" tone="onAccent">
            {user.displayName.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="title2">{user.displayName}</Text>
          <Text variant="callout" tone="secondary">
            {user.email}
          </Text>
        </View>
      </View>
      {me.error && (
        <Text variant="caption" tone="secondary">
          Couldn't refresh. Showing what was saved at{' '}
          {new Date(me.dataUpdatedAt).toLocaleTimeString()}.
        </Text>
      )}
    </Card>
  );
}
