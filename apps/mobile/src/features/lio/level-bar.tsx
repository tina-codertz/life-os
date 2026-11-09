import type { ProgressLevel } from '@life-os/shared';
import { View } from 'react-native';
import { radius, useTheme } from '@/theme';

// How far through this level (the purple bar on the Lio page and the chest screen).
export function LevelBar({ level }: { level: ProgressLevel }) {
  const { colors } = useTheme();
  const fraction = (level.next - level.toNext - level.start) / (level.next - level.start);
  const percent = Math.round(fraction * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Level ${level.level + 1}`}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        alignSelf: 'stretch',
        height: 10,
        borderRadius: radius.full,
        backgroundColor: colors.chart.track,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          borderRadius: radius.full,
          backgroundImage: `linear-gradient(90deg, ${colors.accent.fill}, ${colors.accent.fillEnd})`,
        }}
      />
    </View>
  );
}
