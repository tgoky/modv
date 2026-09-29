import "server-only";

/** In-memory brake on repeated failed sign-ins. Resets on restart; use a shared store in production. */
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 8;

const failures = new Map<string, { count: number; since: number }>();

export function isThrottled(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) failures.set(key, { count: 1, since: Date.now() });
  else entry.count += 1;
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
