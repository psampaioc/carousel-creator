import { describe, expect, it } from "vitest";

import { upsertRows } from "@/convex/sheetImport";
import type { ParsedCandidateRow } from "@/lib/sheets/contract";

type RecordValue = { _id: string; [key: string]: unknown };

function handlerOf(operation: unknown) {
  return (operation as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler;
}

function memoryContext() {
  const tables = new Map<string, RecordValue[]>();
  const records = (table: string) => tables.get(table) ?? [];
  return {
    tables,
    db: {
      query: (table: string) => ({
        withIndex: (_name: string, build: (q: { eq: (_field: string, value: unknown) => unknown }) => unknown) => {
          let expected: unknown;
          build({ eq: (_field, value) => (expected = value) });
          const matching = () => records(table).filter((item) =>
            item.externalRowId === expected || item.candidateId === expected,
          );
          return { unique: async () => matching()[0] ?? null, collect: async () => matching() };
        },
      }),
      insert: async (table: string, value: Record<string, unknown>) => {
        const id = `${table}-${records(table).length + 1}`;
        tables.set(table, [...records(table), { _id: id, ...value }]);
        return id;
      },
      patch: async (id: string, value: Record<string, unknown>) => {
        for (const [table, items] of tables) {
          tables.set(table, items.map((item) => (item._id === id ? { ...item, ...value } : item)));
        }
      },
      delete: async (id: string) => {
        for (const [table, items] of tables) tables.set(table, items.filter((item) => item._id !== id));
      },
    },
  };
}

const parsedRow: ParsedCandidateRow = {
  researchRunId: "run-1",
  externalRowId: "stable-event-1",
  title: "Robotics open day",
  format: "in_person",
  startAt: Date.parse("2026-09-02T18:00:00+01:00"),
  city: "Coimbra",
  topicRelevance: 95,
  weekMatch: true,
  geographyBand: "coimbra",
  sources: [
    {
      sourceId: "official",
      url: "https://example.org/event",
      label: "Official page",
      excerpt: "Event evidence",
      collectedAt: "2026-08-30T08:00:00Z",
      isOfficial: true,
    },
  ],
  supportedFacts: [{ field: "startAt", value: "2026-09-02", sourceIds: ["official"] }],
  conflicts: [],
  images: [
    {
      driveFileId: "officialImage123",
      sourceUrl: "https://example.org/image.jpg",
      provenance: "official",
      collectedAt: Date.parse("2026-08-30T08:00:00Z"),
    },
  ],
  editorialStatus: "imported",
  updatedAt: Date.parse("2026-08-30T08:00:00Z"),
  findings: [],
};

describe("Sheet import", () => {
  it("upserts by stable row ID and preserves source and image provenance", async () => {
    const context = memoryContext();
    await handlerOf(upsertRows)(context, { rows: [parsedRow] });
    await handlerOf(upsertRows)(context, { rows: [{ ...parsedRow, title: "Updated title" }] });

    expect(context.tables.get("candidates")).toHaveLength(1);
    expect(context.tables.get("candidates")?.[0]).toMatchObject({
      title: "Updated title",
      status: "ready_for_review",
    });
    expect(context.tables.get("sources")).toHaveLength(1);
    expect(context.tables.get("imageCandidates")?.[0]).toMatchObject({
      driveFileId: "officialImage123",
      provenance: "official",
      sortOrder: 0,
    });
  });

  it("imports findings as needs_attention", async () => {
    const context = memoryContext();
    await handlerOf(upsertRows)(context, { rows: [{ ...parsedRow, findings: ["Missing evidence"] }] });
    expect(context.tables.get("candidates")?.[0]).toMatchObject({
      status: "needs_attention",
      importFindings: ["Missing evidence"],
    });
  });
});
