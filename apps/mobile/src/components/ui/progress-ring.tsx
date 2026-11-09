import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';

interface ProgressRingProps {
  percent: number; // 0–100
  size: number;
  stroke: number;
  // What the screen reader says before the value, e.g. "Ship Life OS MVP progress".
  label: string;
  color?: string;
  trackColor?: string;
  // The number in the middle ("68%"); hidden from screen readers, which hear the value.
  children?: ReactNode;
}

// The design's progress ring (Goals and Goal detail): a track and an arc from 12 o'clock,
// clockwise, with the percentage in the middle. Announced as a progress bar with its value.
export function ProgressRing({
  percent,
  size,
  stroke,
  label,
  color,
  trackColor,
  children,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: clamped, text: `${clamped}%` }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor ?? colors.chart.track}
          strokeWidth={stroke}
          fill="none"
        />
        {clamped > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color ?? colors.accent.fill}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            testID="progress-arc"
          />
        )}
      </Svg>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
    </View>
  );
}
