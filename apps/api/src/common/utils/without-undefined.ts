// Drops keys whose value is undefined. Zod types an optional field as `T | undefined`, but
// with `exactOptionalPropertyTypes` Prisma only accepts the key being *absent*, and
// "present but undefined" can overwrite things in spreads (learning log, 4.1).
export type WithoutUndefined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

export function withoutUndefined<T extends object>(value: T): WithoutUndefined<T> {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  // TypeScript can't follow a filter through generic keys; the filter above is the proof.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries(entries) as WithoutUndefined<T>;
}
