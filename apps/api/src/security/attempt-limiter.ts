// Counts events per key (e.g. failed logins per email) in a fixed time window, in memory.
// The IP-based throttler can't stop one account being attacked from many IPs; this can.
// One API instance (ADR-008): several instances would need these counters in Redis.
export class AttemptLimiter {
  private readonly windows = new Map<string, { count: number; resetsAt: number }>();

  constructor(
    readonly limit: number,
    readonly windowMs: number,
    // Bounds memory: a flood of made-up keys can't grow the map forever.
    private readonly maxKeys = 100_000,
  ) {}

  // Seconds until `key` may try again, or 0 if it isn't blocked.
  blockedForSeconds(key: string, now = Date.now()): number {
    const entry = this.current(key, now);
    return entry && entry.count >= this.limit ? Math.ceil((entry.resetsAt - now) / 1000) : 0;
  }

  // Counts one event. Returns false if this event is over the limit.
  hit(key: string, now = Date.now()): boolean {
    let entry = this.current(key, now);
    if (!entry) {
      this.makeRoom();
      entry = { count: 0, resetsAt: now + this.windowMs };
      this.windows.set(key, entry);
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  get size(): number {
    return this.windows.size;
  }

  private current(key: string, now: number) {
    const entry = this.windows.get(key);
    if (entry && entry.resetsAt <= now) {
      this.windows.delete(key);
      return undefined;
    }
    return entry;
  }

  // Full: drop the oldest entries. Maps keep insertion order, and every window has the same
  // length, so the oldest entry is also the first to expire (or already has).
  private makeRoom(): void {
    while (this.windows.size >= this.maxKeys) {
      const oldest = this.windows.keys().next().value;
      if (oldest === undefined) break;
      this.windows.delete(oldest);
    }
  }
}
