import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { Icon, type IconName, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

const ICONS: Record<string, IconName> = {
  today: 'home',
  tasks: 'tasks',
  habits: 'flame',
  money: 'wallet',
  more: 'person',
};

// The design's floating dock: a white pill above the home indicator. The current tab is an ink
// pill with its name; the others show only their icon, so each one's name is its label.
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: Math.max(insets.bottom, spacing.gutter),
        height: 68,
        borderRadius: radius.full,
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.sm,
      }}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const title = descriptors[route.key]?.options.title ?? route.name;
        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={title}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            testID={`tab-${route.name}`}
            style={({ pressed }) => ({
              height: 48,
              minWidth: 48,
              paddingHorizontal: focused ? spacing.lg : 0,
              borderRadius: radius.full,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              backgroundColor: focused ? colors.ink.fill : 'transparent',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon
              name={ICONS[route.name] ?? 'person'}
              size={20}
              color={focused ? colors.ink.text : colors.text.label}
            />
            {focused && (
              <Text variant="calloutStrong" tone="onInk" numberOfLines={1}>
                {title}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
