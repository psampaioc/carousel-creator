import { describe, expect, it } from "vitest";

import { summarizeWorkspaceCandidates } from "../../lib/workspace/summary";

describe("summarizeWorkspaceCandidates", () => {
  it("separates the choices needed to start a weekly carousel", () => {
    expect(
      summarizeWorkspaceCandidates([
        { status: "approved" },
        { status: "approved" },
        { status: "ready_for_review" },
        { status: "needs_attention" },
        { status: "rejected" },
      ]),
    ).toEqual({
      total: 5,
      approved: 2,
      readyForReview: 1,
      needsAttention: 1,
    });
  });
});
