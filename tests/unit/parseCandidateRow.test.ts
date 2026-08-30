import { describe, expect, it } from "vitest";

import { type SheetHeader } from "@/lib/sheets/contract";
import { parseCandidateRow } from "@/lib/sheets/parseCandidateRow";

function row(overrides: Partial<Record<SheetHeader, string>> = {}): Record<SheetHeader, string> {
  return {
    research_run_id: "run-2026-08-30",
    external_row_id: "event-uc-robotics-1",
    title: "Robotics open day",
    format: "in_person",
    start_at: "2026-09-02T18:00:00+01:00",
    end_at: "2026-09-02T20:00:00+01:00",
    venue: "DEI, Universidade de Coimbra",
    city: "Coimbra",
    topic_relevance: "95",
    week_match: "true",
    geography_band: "coimbra",
    sources_json: JSON.stringify([
      {
        sourceId: "official-page",
        url: "https://example.org/robotics",
        label: "Official event page",
        excerpt: "Robotics open day on 2 September at DEI",
        collectedAt: "2026-08-30T08:00:00Z",
        isOfficial: true,
      },
    ]),
    supported_facts_json: JSON.stringify([
      { field: "startAt", value: "2026-09-02T18:00:00+01:00", sourceIds: ["official-page"] },
    ]),
    conflicts_json: "[]",
    images_json: JSON.stringify([
      {
        driveFileId: "officialImage123",
        sourceUrl: "https://example.org/robotics/image.jpg",
        provenance: "official",
        collectedAt: "2026-08-30T08:00:00Z",
      },
    ]),
    editorial_status: "imported",
    updated_at: "2026-08-30T08:00:00Z",
    ...overrides,
  };
}

describe("parseCandidateRow", () => {
  it("accepts a complete evidence-backed event", async () => {
    const parsed = await parseCandidateRow(row(), async () => true);
    expect(parsed.findings).toEqual([]);
    expect(parsed.editorialStatus).toBe("imported");
    expect(parsed.sources).toHaveLength(1);
    expect(parsed.images[0]).toMatchObject({ provenance: "official", driveFileId: "officialImage123" });
  });

  it("keeps incomplete evidence visible as findings", async () => {
    const parsed = await parseCandidateRow(row({ sources_json: "[]" }), async () => true);
    expect(parsed.editorialStatus).toBe("needs_attention");
    expect(parsed.findings).toContain("At least one complete source is required");
    expect(parsed.findings).toContain("Every supported fact must reference one or more imported source IDs");
  });

  it("flags material conflicts without choosing a value", async () => {
    const conflicts = JSON.stringify([
      { field: "startAt", values: ["2026-09-02T18:00:00+01:00", "2026-09-03T18:00:00+01:00"] },
    ]);
    const parsed = await parseCandidateRow(row({ conflicts_json: conflicts }), async () => true);
    expect(parsed.conflicts[0].values).toHaveLength(2);
    expect(parsed.findings).toContain("Material source conflict requires operator review");
  });
});
