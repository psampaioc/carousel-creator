import { describe, expect, it } from "vitest";

import { EXPORT_ATTEMPT_TIMEOUT_MS, exportAttemptIsStale } from "@/lib/carousel/exportAttempt";

describe("export attempt locking", () => {
  it("keeps a recent export attempt locked for another tab", () => {
    expect(exportAttemptIsStale(1_000, 1_000 + EXPORT_ATTEMPT_TIMEOUT_MS - 1)).toBe(false);
  });

  it("releases an abandoned export attempt after the timeout", () => {
    expect(exportAttemptIsStale(1_000, 1_000 + EXPORT_ATTEMPT_TIMEOUT_MS)).toBe(true);
  });
});
