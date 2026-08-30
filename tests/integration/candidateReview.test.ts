import { describe, expect, it } from "vitest";

import { assertCandidateCanEnterDraft, candidateStatusAfterConflictResolution } from "@/convex/candidates";

describe("candidate review gates", () => {
  it("blocks a candidate with unresolved source conflicts from approval or a draft", () => {
    expect(() => assertCandidateCanEnterDraft({ status: "needs_attention", conflicts: [{ resolved: false }], importFindings: [] })).toThrow("Candidate is not approved");
  });

  it("allows a conflict-free approved candidate into a draft", () => {
    expect(() => assertCandidateCanEnterDraft({ status: "approved", conflicts: [], importFindings: [] })).not.toThrow();
  });

  it("returns a resolved candidate to review only when no other findings remain", () => {
    expect(candidateStatusAfterConflictResolution([], [{ resolved: true }])).toBe("ready_for_review");
    expect(candidateStatusAfterConflictResolution(["Missing source"], [{ resolved: true }])).toBe("needs_attention");
  });
});
