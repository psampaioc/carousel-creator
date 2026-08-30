import { internalMutationGeneric } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { ParsedCandidateRow } from "../lib/sheets/contract";

const parsedRowValidator = v.any();

export const upsertRows = internalMutationGeneric({
  args: { rows: v.array(parsedRowValidator) },
  handler: async (ctx, args) => {
    const results: Array<{ externalRowId: string; candidateId: string; status: string }> = [];

    for (const row of args.rows as ParsedCandidateRow[]) {
      const existing = await ctx.db
        .query("candidates")
        .withIndex("by_external_row_id", (q) => q.eq("externalRowId", row.externalRowId))
        .unique();
      const now = Date.now();
      const values = {
        externalRowId: row.externalRowId,
        researchRunId: row.researchRunId,
        title: row.title,
        startAt: row.startAt,
        endAt: row.endAt,
        venue: row.venue,
        city: row.city,
        format: row.format,
        status: row.findings.length === 0 ? ("ready_for_review" as const) : ("needs_attention" as const),
        topicRelevance: row.topicRelevance,
        weekMatch: row.weekMatch,
        geographyBand: row.geographyBand,
        importFindings: row.findings,
        conflicts: row.conflicts.map((conflict) => ({ ...conflict, resolved: false })),
        sourceIds: [],
        imageCandidateIds: [],
        updatedAt: now,
      };

      const candidateId = existing?._id ?? (await ctx.db.insert("candidates", { ...values, createdAt: now }));
      if (existing) {
        for (const table of ["sources", "supportedFacts", "imageCandidates"] as const) {
          const records = await ctx.db.query(table).withIndex("by_candidate", (q) => q.eq("candidateId", candidateId)).collect();
          for (const record of records) await ctx.db.delete(record._id);
        }
      }

      const sourceIdByExternalId = new Map<string, Id<"sources">>();
      const sourceIds: Id<"sources">[] = [];
      for (const source of row.sources) {
        const sourceId = await ctx.db.insert("sources", {
          candidateId,
          externalSourceId: source.sourceId,
          url: source.url,
          label: source.label,
          excerpt: source.excerpt,
          collectedAt: Date.parse(source.collectedAt),
          isOfficial: source.isOfficial,
        });
        sourceIds.push(sourceId);
        sourceIdByExternalId.set(source.sourceId, sourceId);
      }

      for (const fact of row.supportedFacts) {
        await ctx.db.insert("supportedFacts", {
          candidateId,
          field: fact.field,
          value: fact.value,
          sourceIds: fact.sourceIds.map((id) => sourceIdByExternalId.get(id)!),
        });
      }

      const imageCandidateIds: Id<"imageCandidates">[] = [];
      for (const [sortOrder, image] of row.images.entries()) {
        imageCandidateIds.push(
          await ctx.db.insert("imageCandidates", { candidateId, ...image, sortOrder }),
        );
      }

      await ctx.db.patch(candidateId, { ...values, sourceIds, imageCandidateIds });
      results.push({ externalRowId: row.externalRowId, candidateId, status: values.status });
    }

    return results;
  },
});
