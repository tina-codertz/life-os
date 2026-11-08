import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

// Room at the bottom of tab screens for the floating tab bar (68 pt + 20 pt margin) and, above
// it, Lio's bubble and the "+" buttons (56 pt + 16 pt), so the last row can scroll clear.
export const TAB_BAR_SPACE = 172;

// The soft colour fading in at the top of every screen in the design. Drawn behind the
// content, ignored by touches and screen readers.
export function ScreenWash({ height = 300 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
        backgroundImage: `linear-gradient(180deg, ${colors.bg.wash} 0%, ${colors.bg.canvas} 100%)`,
      }}
    />
  );
}

// Big title, a line under it, and round buttons on the right (search, filters, +).
export function ScreenHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle && <Text tone="secondary">{subtitle}</Text>}
      </View>
      {actions && <View style={{ flexDirection: 'row', gap: spacing.sm }}>{actions}</View>}
    </View>
  );
}

// A scrolling tab screen: wash, header, then content. `tabBar` leaves room for the floating
// tab bar; screens outside the tabs pass false.
export function Screen({
  title,
  subtitle,
  actions,
  children,
  tabBar = true,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  tabBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + (tabBar ? TAB_BAR_SPACE : spacing.xl),
          paddingHorizontal: spacing.gutter,
          gap: spacing.lg,
        }}
      >
        <ScreenHeader title={title} subtitle={subtitle} actions={actions} />
        {children}
      </ScrollView>
    </View>
  );
}
