import { describe, expect, it } from "vitest";

import { assertDraftCandidate, orderImageCandidates, reorderEventSlides, selectWeeklyCandidates, totalSlideCount } from "@/lib/carousel/buildWeeklyDraft";

const candidate = (overrides = {}) => ({
  _id: "candidate-a", title: "Robotics evening", format: "in_person" as const, status: "approved", conflicts: [], importFindings: [], sourceIds: ["source-a"], imageCandidateIds: ["image-a"], ...overrides,
});

describe("weekly draft limits", () => {
  it("keeps one cover, nine in-person slides, and one online slide", () => {
    const inPerson = Array.from({ length: 10 }, (_, index) => candidate({ _id: `in-${index}` }));
    const online = Array.from({ length: 6 }, (_, index) => candidate({ _id: `online-${index}`, format: "online" as const }));
    const selected = selectWeeklyCandidates([...inPerson, ...online]);
    expect(selected.inPerson).toHaveLength(8); expect(selected.online).toHaveLength(5);
    expect(totalSlideCount(selected.inPerson.length, selected.online.length)).toBe(10);
  });

  it("does not manufacture slides for a sparse week", () => {
    const selected = selectWeeklyCandidates([candidate({ _id: "one" }), candidate({ _id: "two" })]);
    expect(selected.inPerson).toHaveLength(2); expect(totalSlideCount(selected.inPerson.length, selected.online.length)).toBe(3);
  });

  it("refuses unapproved or unsupported candidates", () => {
    expect(() => assertDraftCandidate(candidate({ status: "needs_attention" }))).toThrow("Only approved candidates");
    expect(() => assertDraftCandidate(candidate({ sourceIds: [] }))).toThrow("no source evidence");
  });
});

describe("editor ordering", () => {
  it("orders images by explicit order and provenance fallback", () => {
    const images = orderImageCandidates([
      { id: "generated", provenance: "generated" as const },
      { id: "announcement", provenance: "announcement" as const },
      { id: "official", provenance: "official" as const },
      { id: "pinned", provenance: "generated" as const, sortOrder: 0 },
    ]);

    expect(images.map((image) => image.id)).toEqual(["pinned", "official", "announcement", "generated"]);
  });

  it("moves event slides without moving the cover or online slide", () => {
    expect(reorderEventSlides(["cover", "one", "two", "online"], "two", "up")).toEqual(["cover", "two", "one", "online"]);
    expect(reorderEventSlides(["cover", "one", "two", "online"], "one", "up")).toEqual(["cover", "one", "two", "online"]);
  });
});
