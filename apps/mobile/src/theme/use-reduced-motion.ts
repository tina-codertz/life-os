import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// The system's "Reduce Motion" setting (docs/07 principle 5): animations become instant when
// it's on. Follows changes made while the app is open.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
