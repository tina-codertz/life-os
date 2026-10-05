import { colors, radius } from "@/theme";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";


export default function TabLayout() {

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.accentRed,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle:styles.tabBar,
        }}

      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="home-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="habits"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="checkmark-circle-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="bar-chart-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="settings-outline"
                size={size}
                color={color}
              />
            ),
          }}
          />
      </Tabs>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={() => console.log("FAB pressed") }
      >
        <Ionicons
          name="add"
          size={30}
          color={colors.textPrimary}
        />
      </Pressable>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },

  tabBar: {
    backgroundColor: colors.surfaceRaised,
    borderTopWidth: 0,

  },

  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: "center",
    alignSelf: 'center',
    bottom:36,
  },

  fabPressed: {
    opacity:0.7
  }
})
