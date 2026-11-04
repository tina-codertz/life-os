import { PRIORITIES } from '@life-os/shared';
import { StyleSheet, Text, View } from 'react-native';

// Temporary screen for Phase 3.3: proves the app can import from packages/shared.
// Replaced by the auth gate / Today screen in Phase 5.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Life OS</Text>
      <Text style={styles.subtitle}>Shared priorities: {PRIORITIES.join(' · ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0E0E12',
  },
  title: { color: '#F5F5F7', fontSize: 34, fontWeight: '700' },
  subtitle: { color: '#9A9AA3', fontSize: 14 },
});
