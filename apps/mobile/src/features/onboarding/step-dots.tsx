import { View } from 'react-native';
import { radius, spacing, useTheme } from '@/theme';

// The design's page dots: the current step is a long ink pill. Read out as "Step 1 of 2".
export function StepDots({ step, of }: { step: number; of: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Step ${step} of ${of}`}
      style={{ flexDirection: 'row', gap: spacing.sm }}
    >
      {Array.from({ length: of }, (_, i) => (
        <View
          key={i}
          style={{
            height: 8,
            width: i + 1 === step ? 30 : 8,
            borderRadius: radius.full,
            backgroundColor: i + 1 === step ? colors.ink.fill : colors.border.subtle,
          }}
        />
      ))}
    </View>
  );
}
