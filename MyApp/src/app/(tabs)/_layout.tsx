import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

const FAB_SIZE = 56;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.accentRed,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: tabIcon("today-outline") }} />
        <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarIcon: tabIcon("checkbox-outline") }} />
        <Tabs.Screen name="habits" options={{ title: "Habits", tabBarIcon: tabIcon("flame-outline") }} />
        <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon("settings-outline") }} />
      </Tabs>

      {/* Overlay sibling, not a tab: it sits between tabs 2 and 3 and never becomes a route. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create"
        onPress={() => console.log("FAB pressed")}
        style={({ pressed }) => [styles.fab, { bottom: 36 + insets.bottom }, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={32} color={colors.bg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
  },
  fab: {
    position: "absolute",
    alignSelf: "center",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentGreen,
  },
  fabPressed: {
    opacity: 0.8,
  },
});
