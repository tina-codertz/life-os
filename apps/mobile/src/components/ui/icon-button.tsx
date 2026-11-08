import { Pressable } from 'react-native';
import { MIN_TOUCH_TARGET, radius, useTheme } from '@/theme';
import { Icon, type IconName } from './icon';

export interface IconButtonProps {
  icon: IconName;
  // Required: an icon alone says nothing to a screen reader.
  accessibilityLabel: string;
  onPress: () => void;
  // 'surface': the round white button in screen headers. 'ink': the floating "+" button.
  variant?: 'surface' | 'ink';
  size?: number;
  testID?: string;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'surface',
  size = MIN_TOUCH_TARGET,
  testID,
}: IconButtonProps) {
  const { colors, shadows } = useTheme();
  const ink = variant === 'ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ink ? colors.ink.fill : colors.bg.surface,
        boxShadow: ink ? shadows.lg : shadows.sm,
        opacity: pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Icon name={icon} size={ink ? 24 : 20} color={ink ? colors.ink.text : colors.text.primary} />
    </Pressable>
  );
}
