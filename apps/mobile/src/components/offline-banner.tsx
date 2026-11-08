import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useIsOnline } from '@/services/network';
import { radius, spacing, useTheme } from '@/theme';

// A small notice under the status bar while offline (docs/07 §6: "Offline → OfflineBanner +
// cached data"). It doesn't take taps, so the screen underneath stays usable.
export function OfflineBanner() {
  const online = useIsOnline();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + spacing.xs,
        alignSelf: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: colors.bg.elevated,
        borderWidth: 1,
        borderColor: colors.border.subtle,
      }}
    >
      <Text variant="caption" accessibilityRole="alert" accessibilityLiveRegion="polite">
        You're offline. Showing saved data.
      </Text>
    </View>
  );
}
