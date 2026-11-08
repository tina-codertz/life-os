import { router } from 'expo-router';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { spacing } from '@/theme';

// A native form sheet (opened from the design preview), the pattern for task/habit forms.
export default function SheetDemo() {
  return (
    <View style={{ padding: spacing.lg, gap: spacing.md }}>
      <Text variant="title2" accessibilityRole="header">
        Native sheet
      </Text>
      <Text tone="secondary">
        Drag the grabber to resize or dismiss. Forms like "New task" will open this way.
      </Text>
      <Button title="Close" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}
