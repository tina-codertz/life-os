// Copy-then-sort / copy-then-reverse. The app runs on Hermes (Expo Go), which doesn't have the
// newer Array#toSorted / #toReversed, so app code uses these instead (Node, where the tests run,
// has both: tests alone wouldn't notice). The lint config bans those methods in app and shared
// code (.oxlintrc.json), and hermes-compat.test.ts double-checks.
export function sorted<T>(items: readonly T[], compare?: (a: T, b: T) => number): T[] {
  return [...items].sort(compare);
}

export function reversed<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}
