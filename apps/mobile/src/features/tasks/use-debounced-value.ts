import { useEffect, useState } from 'react';

// The value once it has stopped changing for `delayMs`: search asks the server after a pause
// in typing, not on every key.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
