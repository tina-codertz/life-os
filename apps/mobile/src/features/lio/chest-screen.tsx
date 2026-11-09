import { XP } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  IconTile,
  Mascot,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { type ChestKind, useCollectChest, useHabits, useProgress } from '@/features/habits/queries';
import { radius, spacing, useTheme } from '@/theme';
import { LevelBar } from './level-bar';

// The design's confetti: [left, top, width, height, rotation, colour role].
const CONFETTI = [
  [30, 90, 14, 8, 20, 'amber'],
  [80, 60, 10, 10, 0, 'orange'],
  [300, 80, 16, 8, -25, 'violet'],
  [340, 140, 10, 10, 0, 'green'],
  [60, 170, 12, 8, 40, 'pink'],
  [320, 210, 14, 8, 15, 'amber'],
  [20, 260, 10, 10, 0, 'violet'],
  [350, 300, 12, 8, -35, 'pink'],
  [110, 40, 12, 8, -10, 'green'],
  [250, 30, 10, 10, 0, 'orange'],
] as const;

// The design's Chest reward: confetti, "Chest opened!", Lio celebrating, "+40 XP", the day
// streak, the level bar, and Collect (which is when the XP is paid). Opened from the Lio page's
// daily chest (/chest?kind=daily) or a habit's 🎁 on a milestone day (?kind=habit&habitId=…).
export function ChestScreen() {
  const params = useLocalSearchParams<{ kind?: string; habitId?: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const progress = useProgress();
  const habits = useHabits();
  const collect = useCollectChest();

  const chest: ChestKind | null =
    params.kind === 'habit' && params.habitId
      ? { kind: 'habit', habitId: params.habitId }
      : params.kind === 'daily'
        ? { kind: 'daily' }
        : null;
  const habit =
    chest?.kind === 'habit' ? habits.data?.find((h) => h.id === chest.habitId) : undefined;

  const loading = !progress.data || (chest?.kind === 'habit' && !habits.data);
  const ready =
    chest?.kind === 'daily'
      ? progress.data?.dailyChest === 'ready'
      : Boolean(habit?.chest && !habit.chest.collected);
  const caption = habit?.chest ? `${habit.name} · day ${habit.chest.streakDay}` : 'Daily reward';
  const streak = habit ? habit.streak.current : (progress.data?.streak.current ?? 0);

  const confettiColor = {
    amber: colors.reward.fill,
    orange: colors.flame,
    violet: colors.accent.fill,
    green: colors.quest.done,
    pink: colors.category.pink,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(180deg, ${colors.reward.wash} 0%, ${colors.bg.canvas} 55%)`,
        }}
      >
        {ready &&
          CONFETTI.map(([left, top, width, height, rotate, role]) => (
            <View
              key={`${left}-${top}`}
              style={{
                position: 'absolute',
                left: `${(left / 390) * 100}%`,
                top: insets.top + top,
                width,
                height,
                borderRadius: width === height ? width / 2 : 3,
                backgroundColor: confettiColor[role],
                transform: [{ rotate: `${rotate}deg` }],
              }}
            />
          ))}
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.gutter,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
        </View>
        {loading ? (
          <SkeletonGroup label="Opening the chest">
            <Skeleton shape="block" height={360} />
          </SkeletonGroup>
        ) : !chest || !ready ? (
          <Card>
            <EmptyState
              mascot="sleepy"
              title={
                chest?.kind === 'daily' && progress.data?.dailyChest === 'collected'
                  ? 'Already opened today'
                  : habit?.chest?.collected
                    ? 'Already opened'
                    : 'This chest isn’t ready yet'
              }
              description={
                chest?.kind === 'daily'
                  ? 'Finish a task to open a new chest each day.'
                  : 'A chest opens on every 7th day of a streak.'
              }
              action={{ label: 'Back', onPress: () => router.back() }}
            />
          </Card>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  backgroundColor: colors.ink.fill,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md + 2,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text variant="label" tone="onInk" accessibilityRole="header">
                  Chest opened!
                </Text>
              </View>
              <Mascot mood="celebrating" height={150} decorative />
            </View>
            <View
              accessible
              accessibilityLabel={`${caption}: plus ${XP.CHEST} XP`}
              style={{ alignItems: 'center' }}
            >
              <Text variant="calloutStrong" tone="secondary">
                {caption}
              </Text>
              <Text variant="hero" style={{ fontSize: 72, lineHeight: 76, letterSpacing: -3 }}>
                +{XP.CHEST} XP
              </Text>
            </View>
            <View
              accessible
              accessibilityLabel={`${streak}-day streak`}
              style={{
                backgroundColor: colors.tile.peach,
                borderRadius: radius.xl - 2,
                padding: spacing.md,
              }}
            >
              <IconTile icon="flame" tint="rgba(255,255,255,0.75)" size={32} round />
              <Text variant="title2" style={{ marginTop: spacing.sm + 2, fontSize: 24 }}>
                {streak}
              </Text>
              <Text variant="caption" tone="label">
                Day streak
              </Text>
            </View>
            {progress.data && (
              <Card style={{ padding: spacing.md + 2 }}>
                <Text variant="callout" tone="secondary" style={{ fontSize: 14 }}>
                  Level {progress.data.level.level} ·{' '}
                  {progress.data.level.toNext.toLocaleString('en-GB')} XP to level{' '}
                  {progress.data.level.level + 1}
                </Text>
                <LevelBar level={progress.data.level} />
              </Card>
            )}
            <View style={{ flex: 1 }} />
            <Button
              title="Collect"
              size="lg"
              icon="check"
              loading={collect.isPending}
              onPress={() =>
                collect.mutate(chest, {
                  onSuccess: () => router.back(),
                })
              }
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
