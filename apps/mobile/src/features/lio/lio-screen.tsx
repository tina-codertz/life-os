import type { Progress } from '@life-os/shared';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/screen';
import {
  Button,
  Card,
  ErrorState,
  Icon,
  IconButton,
  ListGroup,
  ListRow,
  Mascot,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { ProgressChips } from '@/features/habits/progress-chips';
import { useProgress } from '@/features/habits/queries';
import { radius, spacing, useTheme } from '@/theme';
import { LevelBar } from './level-bar';

// The design's Lio page, opened from Lio's bubble: the 🔥 / ⚡ chips, Lio's level card
// ("12 days strong!", "Lio · Level 5", "260 XP to level 6") and the daily chest. The design's
// weekly challenge and badges come with their own steps.
export function LioScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const progress = useProgress();

  let body: React.ReactNode;
  if (progress.data) {
    body = (
      <>
        <LevelCard {...progress.data} />
        <DailyChestCard state={progress.data.dailyChest} />
        <AskLioRow />
      </>
    );
  } else if (progress.error) {
    body = (
      <Card>
        <ErrorState
          error={progress.error}
          onRetry={() => void progress.refetch()}
          retrying={progress.isFetching}
        />
      </Card>
    );
  } else {
    body = (
      <SkeletonGroup label="Loading your level">
        <Skeleton shape="block" height={300} />
        <Skeleton shape="block" height={80} />
      </SkeletonGroup>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.gutter,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <IconButton icon="chevronLeft" accessibilityLabel="Back" onPress={() => router.back()} />
          <Text
            variant="display"
            accessibilityRole="header"
            style={{ position: 'absolute', opacity: 0 }}
          >
            Lio
          </Text>
          <View style={{ flex: 1 }} />
          <ProgressChips />
        </View>
        {body}
      </ScrollView>
    </View>
  );
}

function LevelCard({ level, streak }: Pick<Progress, 'level' | 'streak'>) {
  const { colors } = useTheme();
  return (
    <Card variant="elevated" style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
      {streak.current > 0 && (
        <View
          style={{
            backgroundColor: colors.ink.fill,
            borderRadius: radius.full,
            paddingHorizontal: spacing.md + 2,
            paddingVertical: spacing.xs + 2,
          }}
        >
          <Text variant="label" tone="onInk">
            {streak.current} {streak.current === 1 ? 'day' : 'days'} strong!
          </Text>
        </View>
      )}
      <Mascot mood="excited" height={150} decorative />
      <Text variant="title1" accessibilityRole="header">
        Lio · Level {level.level}
      </Text>
      <Text variant="callout" tone="secondary">
        {level.toNext.toLocaleString('en-GB')} XP to level {level.level + 1}
      </Text>
      <View style={{ alignSelf: 'stretch', marginTop: spacing.md }}>
        <LevelBar level={level} />
      </View>
    </Card>
  );
}

// Ask Lio lives on Lio's own page (your choice); the assistant itself comes in v2.
function AskLioRow() {
  const { colors } = useTheme();
  return (
    <ListGroup>
      <ListRow
        icon="sparkle"
        tint={colors.tile.peach}
        title="Ask Lio"
        value="Coming soon"
        accessibilityHint="Plan your day or sum up your week with Lio"
        onPress={() => router.push('/coming-soon')}
      />
    </ListGroup>
  );
}

const CHEST_TEXT: Record<Progress['dailyChest'], { title: string; detail: string }> = {
  locked: { title: 'Daily chest', detail: 'Finish one task to open it' },
  ready: { title: 'Daily chest is ready', detail: 'Open it for +40 XP' },
  collected: { title: 'Daily chest opened', detail: 'A new one comes tomorrow' },
};

// The design's amber card: locked until a task is done today, then Open.
function DailyChestCard({ state }: { state: Progress['dailyChest'] }) {
  const { colors } = useTheme();
  const { title, detail } = CHEST_TEXT[state];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.reward.fill,
        borderRadius: radius.xl,
        padding: spacing.lg,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.full,
          backgroundColor: 'rgba(255,255,255,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={state === 'locked' ? 'lock' : 'gift'} size={22} color={colors.reward.text} />
      </View>
      <View style={{ flex: 1 }} accessible>
        <Text variant="bodyStrong" style={{ color: colors.reward.text }}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: colors.reward.text }}>
          {detail}
        </Text>
      </View>
      {state === 'ready' && (
        <Button
          title="Open"
          size="sm"
          onPress={() => router.push({ pathname: '/chest', params: { kind: 'daily' } })}
        />
      )}
    </View>
  );
}
