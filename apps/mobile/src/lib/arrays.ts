// Copy-then-sort / copy-then-reverse. The app runs on Hermes (Expo Go), which doesn't have the
// newer Array#toSorted / #toReversed, so app code uses these instead (Node, where the tests run,
// has both: tests alone wouldn't notice). no-array-sort / no-array-reverse ask for toSorted /
// toReversed; here the array is a fresh copy, so nothing outside is changed.
export function sorted<T>(items: readonly T[], compare?: (a: T, b: T) => number): T[] {
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...items].sort(compare);
}

export function reversed<T>(items: readonly T[]): T[] {
  // oxlint-disable-next-line unicorn/no-array-reverse
  return [...items].reverse();
}
