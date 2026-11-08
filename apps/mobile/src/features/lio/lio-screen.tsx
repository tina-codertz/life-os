import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/screen';
import {
  Card,
  ErrorState,
  IconButton,
  Mascot,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { ProgressChips } from '@/features/habits/progress-chips';
import { useProgress } from '@/features/habits/queries';
import { radius, spacing, useTheme } from '@/theme';

// The design's Lio page, opened from Lio's bubble: the 🔥 / ⚡ chips and Lio's level card
// ("12 days strong!", "Lio · Level 5", "260 XP to level 6"). The design's daily chest, weekly
// challenge and badges come with their own steps.
export function LioScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const progress = useProgress();

  let body: React.ReactNode;
  if (progress.data) {
    body = <LevelCard {...progress.data} />;
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

function LevelCard({
  level,
  streak,
}: {
  level: { level: number; start: number; next: number; toNext: number };
  streak: { current: number };
}) {
  const { colors } = useTheme();
  const fraction = (level.next - level.toNext - level.start) / (level.next - level.start);
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
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Level ${level.level + 1}`}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
        style={{
          alignSelf: 'stretch',
          height: 10,
          marginTop: spacing.md,
          borderRadius: radius.full,
          backgroundColor: colors.chart.track,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(fraction * 100)}%`,
            height: '100%',
            borderRadius: radius.full,
            backgroundImage: `linear-gradient(90deg, ${colors.accent.fill}, ${colors.accent.fillEnd})`,
          }}
        />
      </View>
    </Card>
  );
}
