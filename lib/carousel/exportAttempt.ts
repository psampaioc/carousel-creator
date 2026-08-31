export const EXPORT_ATTEMPT_TIMEOUT_MS = 15 * 60 * 1000;

export function exportAttemptIsStale(updatedAt: number, now: number): boolean {
  return now - updatedAt >= EXPORT_ATTEMPT_TIMEOUT_MS;
}
