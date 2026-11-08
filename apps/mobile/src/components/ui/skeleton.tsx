import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, View } from 'react-native';
import { radius, useReducedMotion, useTheme } from '@/theme';

export type SkeletonShape = 'line' | 'circle' | 'block';

export interface SkeletonProps {
  shape?: SkeletonShape;
  width?: DimensionValue;
  height?: number;
  // docs/07 §6: only show a skeleton after 150 ms, so fast loads don't flicker.
  delayMs?: number;
}

const DEFAULT_HEIGHT: Record<SkeletonShape, number> = { line: 14, circle: 40, block: 72 };

// A grey placeholder in the shape of content that's still loading. It gently pulses unless the
// user has asked for reduced motion. Screen readers skip it: wrap skeletons in a container
// labelled "Loading" (see SkeletonGroup).
export function Skeleton({ shape = 'line', width = '100%', height, delayMs = 150 }: SkeletonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(delayMs === 0);
  // Created once (useState's initializer), not on every render.
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (delayMs === 0) return undefined;
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    if (!visible || reduceMotion) return undefined;
    // Opacity only, on the native thread: cheap enough to run while the JS thread is busy loading.
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, reduceMotion, opacity]);
  const size = height ?? DEFAULT_HEIGHT[shape];

  if (!visible) return <View style={{ width, height: size }} />;
  return (
    <Animated.View
      testID="skeleton"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: shape === 'circle' ? size : width,
          height: size,
          borderRadius:
            shape === 'circle' ? radius.full : shape === 'block' ? radius.lg : radius.sm,
          backgroundColor: colors.bg.subtle,
        },
        { opacity },
      ]}
    />
  );
}

// A group of skeletons announced once as "Loading" (and as busy) instead of being silent.
export function SkeletonGroup({
  children,
  label = 'Loading',
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ gap: 8 }}
    >
      {children}
    </View>
  );
}
