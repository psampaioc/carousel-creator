import { describe, expect, it } from "vitest";

import { assertExportableDraft, exportFilename } from "@/lib/carousel/exportGuards";

const draft = (overrides = {}) => ({
  needsFinalReview: false,
  slides: [
    { kind: "cover" as const, position: 0, finalReviewComplete: true },
    { kind: "event" as const, position: 1, candidateId: "candidate-1", imageCandidateId: "image-1", finalReviewComplete: true },
  ],
  candidates: [{ _id: "candidate-1", status: "approved", conflicts: [], importFindings: [], sourceIds: ["source-1"], imageCandidateIds: ["image-1"] }],
  ...overrides,
});

describe("carousel export guards", () => {
  it("accepts a completely reviewed draft", () => {
    expect(() => assertExportableDraft(draft())).not.toThrow();
  });

  it("blocks stale approval, missing media, and pending review", () => {
    expect(() => assertExportableDraft(draft({ candidates: [{ ...draft().candidates[0], status: "needs_attention" }] }))).toThrow("no longer approved");
    expect(() => assertExportableDraft(draft({ slides: [{ kind: "cover", position: 0, finalReviewComplete: true }, { kind: "event", position: 1, candidateId: "candidate-1", finalReviewComplete: true }] }))).toThrow("selected image");
    expect(() => assertExportableDraft(draft({ needsFinalReview: true }))).toThrow("factual review");
  });

  it("creates stable numbered Instagram filenames", () => {
    expect(exportFilename("2026-09-07", 0)).toBe("2026-09-07-coimbra-events-01.png");
    expect(exportFilename("2026-09-07", 9)).toBe("2026-09-07-coimbra-events-10.png");
  });
});
