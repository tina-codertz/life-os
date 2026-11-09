import type { Theme } from '@life-os/shared';
import { router } from 'expo-router';
import { Alert, type AlertButton, Platform, Pressable, View } from 'react-native';
import { Screen } from '@/components/screen';
import {
  Card,
  ErrorState,
  type IconName,
  IconTile,
  ListGroup,
  ListRow,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { useMe, useSetHabitReminders, useSetTheme } from '@/features/users/queries';
import { radius, spacing, useTheme } from '@/theme';

const THEME_LABEL: Record<Theme, string> = { LIGHT: 'Light', DARK: 'Dark', SYSTEM: 'System' };
// Light, Dark, System: the order people read the choice in.
const THEME_ORDER: Theme[] = ['LIGHT', 'DARK', 'SYSTEM'];

// Appearance uses the phone's own choice dialog (the design shows the row, not a picker).
function chooseTheme(onChoose: (theme: Theme) => void) {
  const buttons: AlertButton[] = THEME_ORDER.map((theme) => ({
    text: THEME_LABEL[theme],
    onPress: () => onChoose(theme),
  }));
  // Android dialogs hold at most three buttons and close on a tap outside; iOS adds Cancel.
  if (Platform.OS === 'ios') buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Appearance', undefined, buttons, { cancelable: true });
}

// Notifications: for now, habit reminders on or off (the phone's own choice dialog, like
// Appearance). Turning them off cancels the scheduled reminders; on schedules them again.
function chooseReminders(onChoose: (on: boolean) => void) {
  const buttons: AlertButton[] = [
    { text: 'On', onPress: () => onChoose(true) },
    { text: 'Off', onPress: () => onChoose(false) },
  ];
  if (Platform.OS === 'ios') buttons.push({ text: 'Cancel', style: 'cancel' });
  Alert.alert('Habit reminders', undefined, buttons, { cancelable: true });
}

// Signing out asks first: it's easy to tap by accident and you'd have to sign in again.
function confirmSignOut(signOut: () => void) {
  Alert.alert('Sign out?', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: signOut },
  ]);
}

// The design's Settings screen: profile card, then preferences, then the account. Only rows
// that work today are shown; export, privacy and delete arrive with their phases.
export default function Settings() {
  const { signOut } = useSession();
  const { colors } = useTheme();
  const me = useMe();
  const setTheme = useSetTheme();
  const setReminders = useSetHabitReminders();
  const settings = me.data?.settings;

  return (
    <Screen title="Settings" subtitle="Profile and preferences">
      <AccountCard me={me} />
      <Shortcuts />
      {settings && (
        <ListGroup>
          <ListRow
            icon="moon"
            tint={colors.tile.lavender}
            title="Appearance"
            value={THEME_LABEL[settings.theme]}
            accessibilityHint="Choose light, dark or system"
            onPress={() => chooseTheme((theme) => setTheme.mutate(theme))}
          />
          <ListRow
            icon="bell"
            tint={colors.tile.peach}
            title="Notifications"
            value={settings.habitRemindersOn ? 'On' : 'Off'}
            accessibilityHint="Turn habit reminders on or off"
            onPress={() => chooseReminders((on) => setReminders.mutate(on))}
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
        <ListRow
          icon="history"
          tint={colors.tile.lime}
          title="History"
          accessibilityHint="Everything you've completed, by week, month and year"
          onPress={() => router.push('/history')}
        />
      </ListGroup>
      <ListGroup>
        <ListRow
          icon="signOut"
          title="Sign out"
          tone="danger"
          onPress={() => confirmSignOut(() => void signOut())}
        />
      </ListGroup>
    </Screen>
  );
}

// The design's four shortcut tiles under the profile. Insights and Ask Lio aren't built yet,
// so they open a "coming soon" screen (your choice: show all four).
function Shortcuts() {
  const { colors } = useTheme();
  const tiles: { label: string; icon: IconName; tint: string; open: () => void }[] = [
    {
      label: 'Goals',
      icon: 'target',
      tint: colors.tile.lavender,
      open: () => router.push('/goals'),
    },
    {
      label: 'Calendar',
      icon: 'calendar',
      tint: colors.tile.sky,
      open: () => router.push('/calendar'),
    },
    {
      label: 'Insights',
      icon: 'chart',
      tint: colors.tile.lime,
      open: () => router.push({ pathname: '/coming-soon', params: { feature: 'insights' } }),
    },
    {
      label: 'Ask Lio',
      icon: 'sparkle',
      tint: colors.tile.peach,
      open: () => router.push({ pathname: '/coming-soon', params: { feature: 'ask-lio' } }),
    },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.label}
          accessibilityRole="button"
          accessibilityLabel={tile.label}
          onPress={tile.open}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            backgroundColor: tile.tint,
            borderRadius: radius.xl,
            borderCurve: 'continuous',
            padding: spacing.md - 4,
            paddingVertical: spacing.md,
            gap: spacing.md,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <IconTile icon={tile.icon} tint="rgba(255,255,255,0.75)" size={36} round />
          <Text variant="calloutStrong" numberOfLines={1} adjustsFontSizeToFit>
            {tile.label}
          </Text>
        </Pressable>
      ))}
    </View>
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
