import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MIN_TOUCH_TARGET, motion, radius, spacing, useReducedMotion, useTheme } from '@/theme';
import { Text } from './text';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  // e.g. { label: 'Undo', onPress } for soft deletes (docs/07 §6).
  action?: { label: string; onPress: () => void };
  durationMs?: number;
}

interface ShownToast extends Required<Omit<ToastOptions, 'action'>> {
  id: number;
  action: ToastOptions['action'];
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

export const TOAST_DURATION_MS = 5000;

// One toast at a time, above the tab bar: a newer one replaces the older. Screen readers hear
// the message; the motion follows the system's Reduce Motion setting.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ShownToast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({
      id: nextId.current,
      message: options.message,
      tone: options.tone ?? 'info',
      action: options.action,
      durationMs: options.durationMs ?? TOAST_DURATION_MS,
    });
    AccessibilityInfo.announceForAccessibility(options.message);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onDismiss={() => setToast(null)} />}
    </ToastContext.Provider>
  );
}

export function useToast(): (options: ToastOptions) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast() must be used inside <ToastProvider>');
  return show;
}

function ToastView({ toast, onDismiss }: { toast: ShownToast; onDismiss: () => void }) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const toneColor = {
    info: colors.text.primary,
    success: colors.success.default,
    error: colors.danger.text,
  }[toast.tone];

  // Fades and rises in (250 ms); instant under Reduce Motion. Opacity and transform only, so it
  // runs on the native thread.
  const reduceMotion = useReducedMotion();
  const [appear] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: reduceMotion ? 0 : motion.base,
      useNativeDriver: true,
    }).start();
  }, [appear, reduceMotion]);

  return (
    <Animated.View
      // Sits above the floating tab bar (68 pt + 20 pt margin) and the home indicator.
      style={{
        position: 'absolute',
        left: spacing.gutter,
        right: spacing.gutter,
        bottom: insets.bottom + 100,
        opacity: appear,
        transform: [
          { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
    >
      <View
        testID="toast"
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: MIN_TOUCH_TARGET,
          paddingLeft: spacing.lg,
          paddingRight: toast.action ? spacing.xs : spacing.lg,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.bg.surface,
          borderLeftWidth: 4,
          borderLeftColor: toneColor,
          boxShadow: shadows.lg,
        }}
      >
        <Text style={{ flex: 1, paddingVertical: spacing.sm }}>{toast.message}</Text>
        {toast.action && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            onPress={() => {
              toast.action?.onPress();
              onDismiss();
            }}
            style={{
              minHeight: MIN_TOUCH_TARGET,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
            }}
          >
            <Text variant="bodyStrong" tone="accent">
              {toast.action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
