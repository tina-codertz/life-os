import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Mascot } from '@/components/ui';
import { radius, useTheme } from '@/theme';

export const LIO_BUBBLE_SIZE = 56;

// Lio's floating bubble, bottom-left above the tab bar on every tab (the "+" buttons sit
// bottom-right). Opens the Lio page: level, XP to the next one, rewards.
export function LioBubble({ bottom, left }: { bottom: number; left: number }) {
  const { colors, shadows } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Lio"
      accessibilityHint="Opens your level and rewards"
      onPress={() => router.push('/lio')}
      testID="lio-bubble"
      style={({ pressed }) => ({
        position: 'absolute',
        left,
        bottom,
        width: LIO_BUBBLE_SIZE,
        height: LIO_BUBBLE_SIZE,
        borderRadius: radius.full,
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.lg,
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Mascot mood="happy" height={50} decorative />
    </Pressable>
  );
}
