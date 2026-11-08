import { type ReactNode, useMemo, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { Icon, type IconName, Text } from '@/components/ui';
import { motion, radius, spacing, useReducedMotion, useTheme } from '@/theme';

// How far a row must be dragged (of its width) to act: a deliberate swipe, not a brush.
export const ROW_SWIPE_THRESHOLD = 0.35;

export type SwipeAction = 'right' | 'left' | null;

// What a drag of `dx` across a row `width` wide does when let go.
export function rowSwipeAction(dx: number, width: number): SwipeAction {
  if (width <= 0) return null;
  if (dx >= width * ROW_SWIPE_THRESHOLD) return 'right';
  if (dx <= -width * ROW_SWIPE_THRESHOLD) return 'left';
  return null;
}

interface Side {
  label: string;
  icon: IconName;
  background: string;
  color: string;
  onAction: () => void;
}

// A row that can be swiped right or left (week 13; deferred from Tasks I). Built on React
// Native's PanResponder + Animated, like Swipe to complete. The swipe is a shortcut only: the
// row's own controls and screen-reader actions do the same things, so the hints behind it are
// hidden from screen readers.
export function SwipeRow({
  right,
  left,
  children,
}: {
  right: Side; // revealed when dragging right
  left: Side; // revealed when dragging left
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(0));

  const pan = useMemo(() => {
    const settle = (toValue: number, then?: () => void) =>
      Animated.timing(x, {
        toValue,
        duration: reduceMotion ? 0 : motion.fast,
        useNativeDriver: true,
      }).start(then);
    const horizontal = (dx: number, dy: number) =>
      Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
    return PanResponder.create({
      // Capture: a sideways drag that starts on the tick or the title still swipes the row,
      // while taps and vertical scrolls are left alone.
      onMoveShouldSetPanResponderCapture: (_e, g) => horizontal(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => x.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        const action = rowSwipeAction(g.dx, width);
        if (action === 'right') settle(0, () => right.onAction());
        else if (action === 'left') {
          // Slide away, act, then come back: if the delete fails and the row returns, it must
          // be in view again (on success it's gone anyway).
          settle(-width, () => {
            left.onAction();
            x.setValue(0);
          });
        } else settle(0);
      },
      onPanResponderTerminate: () => settle(0),
    });
  }, [x, width, right, left, reduceMotion]);

  const hint = (side: Side, align: 'flex-start' | 'flex-end') => (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: align,
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: side.background,
      }}
    >
      <Icon name={side.icon} size={20} color={side.color} />
      <Text variant="calloutStrong" style={{ color: side.color }}>
        {side.label}
      </Text>
    </View>
  );

  return (
    <View
      testID="swipe-row-frame"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ borderRadius: radius.lg + 2, borderCurve: 'continuous', overflow: 'hidden' }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}
      >
        {hint(right, 'flex-start')}
        {hint(left, 'flex-end')}
      </View>
      <Animated.View
        testID="swipe-row"
        {...pan.panHandlers}
        style={{ transform: [{ translateX: x }], backgroundColor: colors.bg.surface }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
