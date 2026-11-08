import { View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { useProgress } from './queries';

// 🔥 the overall streak and ⚡ the XP total (GET /progress).
export function ProgressChips() {
  const { colors } = useTheme();
  const progress = useProgress();
  if (!progress.data) return null;
  const { xp, streak } = progress.data;
  return (
    <>
      <StatChip
        icon="flame"
        color={colors.flame}
        value={String(streak.current)}
        label={`${streak.current}-day streak`}
      />
      <StatChip
        icon="zap"
        color={colors.accent.default}
        value={xp.toLocaleString('en-GB')}
        label={`${xp.toLocaleString('en-GB')} XP`}
      />
    </>
  );
}

function StatChip({
  icon,
  color,
  value,
  label,
}: {
  icon: 'flame' | 'zap';
  color: string;
  value: string;
  label: string;
}) {
  const { colors, shadows } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        height: MIN_TOUCH_TARGET,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.sm,
      }}
    >
      <Icon name={icon} size={18} color={color} />
      <Text variant="calloutStrong">{value}</Text>
    </View>
  );
}
