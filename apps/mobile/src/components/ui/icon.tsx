import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import { View } from 'react-native';
import { useTheme } from '@/theme';

// The design's line icons, drawn with the platform's own icon set: SF Symbols on iOS, Material
// Symbols on Android. Screens name an icon by meaning; this map is the only place that knows
// the platform names.
const ICONS = {
  add: { ios: 'plus', android: 'add' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  check: { ios: 'checkmark', android: 'check' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  clock: { ios: 'clock', android: 'schedule' },
  flag: { ios: 'flag', android: 'flag' },
  flame: { ios: 'flame', android: 'local_fire_department' },
  globe: { ios: 'globe', android: 'public' },
  home: { ios: 'house', android: 'home' },
  lock: { ios: 'lock', android: 'lock' },
  mail: { ios: 'envelope', android: 'mail' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  notes: { ios: 'text.alignleft', android: 'notes' },
  palette: { ios: 'paintpalette', android: 'palette' },
  moon: { ios: 'moon', android: 'dark_mode' },
  person: { ios: 'person', android: 'person' },
  phone: { ios: 'iphone', android: 'smartphone' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  sun: { ios: 'sun.max', android: 'light_mode' },
  tag: { ios: 'tag', android: 'sell' },
  tasks: { ios: 'checklist', android: 'checklist' },
  trash: { ios: 'trash', android: 'delete' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

// Decorative: the button or row around it carries the label, so screen readers skip the icon.
export function Icon({ name, size = 20, color }: IconProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <SymbolView
        name={ICONS[name]}
        size={size}
        tintColor={color ?? colors.text.primary}
        weight="medium"
      />
    </View>
  );
}
