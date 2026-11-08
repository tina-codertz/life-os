import { type BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/tab-bar';
import { useTheme } from '@/theme';

// A plain function (not a component defined inside TabsLayout), so it isn't recreated per render.
const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

// The design's floating tab bar (components/tab-bar.tsx) over docs/03's four tabs + More.
// A JS tab navigator, because the native tab bar can't take this shape.
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg.canvas } }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
