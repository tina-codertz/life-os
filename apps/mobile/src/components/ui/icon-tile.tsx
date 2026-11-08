import { View } from 'react-native';
import { radius, useTheme } from '@/theme';
import { Icon, type IconName } from './icon';

export interface IconTileProps {
  icon: IconName;
  // The pastel behind the icon (colors.tile.* or colors.categoryTile.*).
  tint?: string;
  size?: number;
  iconColor?: string;
  round?: boolean;
}

// The rounded pastel square with a line icon that starts rows and fields in the design.
export function IconTile({ icon, tint, size = 40, iconColor, round = false }: IconTileProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: round ? radius.full : radius.md,
        borderCurve: 'continuous',
        backgroundColor: tint ?? colors.tile.neutral,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        name={icon}
        size={Math.round(size * 0.45)}
        {...(iconColor ? { color: iconColor } : {})}
      />
    </View>
  );
}
