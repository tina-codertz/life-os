import { useMemo, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { motion, radius, spacing, useReducedMotion, useTheme } from '@/theme';

const KNOB = 48;
const PAD = 6;

// How far the knob must travel (of the track) to count: a deliberate swipe, not a brush.
export const SWIPE_THRESHOLD = 0.7;
export function swipeCompletes(dx: number, travel: number): boolean {
  return travel > 0 && dx >= travel * SWIPE_THRESHOLD;
}

// The design's "Swipe to complete" bar: drag the ink check to the right. Built on React
// Native's own PanResponder + Animated (no gesture library). Screen readers get a "Complete"
// action instead of the swipe.
export function SwipeToComplete({ label, onComplete }: { label: string; onComplete: () => void }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const travel = Math.max(0, width - KNOB - PAD * 2);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => x.setValue(Math.min(Math.max(g.dx, 0), travel)),
        onPanResponderRelease: (_e, g) => {
          if (swipeCompletes(g.dx, travel)) {
            Animated.timing(x, {
              toValue: travel,
              duration: reduceMotion ? 0 : motion.fast,
              useNativeDriver: true,
            }).start(() => {
              onComplete();
              x.setValue(0);
            });
          } else {
            Animated.timing(x, {
              toValue: 0,
              duration: reduceMotion ? 0 : motion.base,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [travel, x, onComplete, reduceMotion],
  );

  // The outer view is what screen readers see (with the Complete action); the swipe is on the
  // track inside it, so the gesture handling can't swallow the screen-reader action.
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Swipe right to complete"
      accessibilityActions={[{ name: 'activate', label: 'Complete' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') onComplete();
      }}
      testID="swipe-to-complete"
    >
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...pan.panHandlers}
        style={{
          height: KNOB + PAD * 2,
          borderRadius: radius.full,
          backgroundColor: colors.bg.subtle,
          flexDirection: 'row',
          alignItems: 'center',
          padding: PAD,
          gap: spacing.md + 2,
        }}
      >
        <Animated.View
          style={{
            width: KNOB,
            height: KNOB,
            borderRadius: radius.md + 2,
            backgroundColor: colors.ink.fill,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ translateX: x }],
            zIndex: 1,
          }}
        >
          <Icon name="check" size={24} color={colors.ink.text} />
        </Animated.View>
        <Text variant="calloutStrong" style={{ flex: 1 }}>
          Swipe to complete
        </Text>
        <View style={{ paddingRight: spacing.md }}>
          <Icon name="chevronsRight" size={22} color={colors.text.secondary} />
        </View>
      </View>
    </View>
  );
}
