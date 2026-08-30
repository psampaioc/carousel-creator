import { describe, expect, it } from "vitest";

import { groupCandidates } from "@/lib/ranking/geographyFallback";
import { compareCandidates } from "@/lib/ranking/rankCandidates";

const candidate = (overrides: Partial<{ _id: string; topicRelevance: number; weekMatch: boolean; geographyBand: "coimbra" | "north" | "central" | "online"; format: "in_person" | "online" | "hybrid" }> = {}) => ({
  _id: "candidate-a",
  topicRelevance: 50,
  weekMatch: true,
  geographyBand: "coimbra" as const,
  format: "in_person" as const,
  ...overrides,
});

describe("transparent candidate ranking", () => {
  it("puts relevance before proximity when candidates are otherwise comparable", () => {
    const moreRelevantFurtherAway = candidate({ _id: "north", topicRelevance: 90, geographyBand: "north" });
    const closerLessRelevant = candidate({ _id: "coimbra", topicRelevance: 70, geographyBand: "coimbra" });
    expect(compareCandidates(moreRelevantFurtherAway, closerLessRelevant)).toBeLessThan(0);
  });

  it("uses target-week match before geography when relevance ties", () => {
    const inWeekFurtherAway = candidate({ _id: "north", geographyBand: "north", weekMatch: true });
    const outsideWeekCloser = candidate({ _id: "coimbra", geographyBand: "coimbra", weekMatch: false });
    expect(compareCandidates(inWeekFurtherAway, outsideWeekCloser)).toBeLessThan(0);
  });

  it("separates the geography stages and online events", () => {
    const groups = groupCandidates([
      candidate({ _id: "coimbra" }),
      candidate({ _id: "north", geographyBand: "north" }),
      candidate({ _id: "central", geographyBand: "central" }),
      candidate({ _id: "online", geographyBand: "online", format: "online" }),
    ]);
    expect(groups.coimbra.map((item) => item._id)).toEqual(["coimbra"]);
    expect(groups.north.map((item) => item._id)).toEqual(["north"]);
    expect(groups.central.map((item) => item._id)).toEqual(["central"]);
    expect(groups.online.map((item) => item._id)).toEqual(["online"]);
    expect(groups.isSparse).toBe(true);
  });
});
