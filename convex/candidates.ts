import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOperator } from "./authz";

type SourceEvidence = {
  url: string;
  label: string;
  excerpt: string;
};

export function assertSourceEvidence(source: SourceEvidence): void {
  for (const [field, value] of Object.entries(source)) {
    if (!value.trim()) {
      throw new Error(`Source ${field} is required`);
    }
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source.url);
  } catch {
    throw new Error("Source URL must use HTTP or HTTPS");
  }

  if (sourceUrl.protocol !== "http:" && sourceUrl.protocol !== "https:") {
    throw new Error("Source URL must use HTTP or HTTPS");
  }
}

export const list = queryGeneric({
  args: {},
  handler: async (ctx) => {
    await requireOperator(ctx);
    return await ctx.db.query("candidates").take(100);
  },
});

export const createEvidenceBacked = mutationGeneric({
  args: {
    title: v.string(),
    format: v.union(v.literal("in_person"), v.literal("online"), v.literal("hybrid")),
    source: v.object({
      url: v.string(),
      label: v.string(),
      excerpt: v.string(),
      collectedAt: v.number(),
      isOfficial: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    assertSourceEvidence(args.source);

    const now = Date.now();
    const candidateId = await ctx.db.insert("candidates", {
      title: args.title,
      format: args.format,
      status: "imported",
      conflicts: [],
      sourceIds: [],
      imageCandidateIds: [],
      createdAt: now,
      updatedAt: now,
    });
    const sourceId = await ctx.db.insert("sources", {
      candidateId,
      ...args.source,
    });
    await ctx.db.patch(candidateId, { sourceIds: [sourceId] });

    return candidateId;
  },
});
