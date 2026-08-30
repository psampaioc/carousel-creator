import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOperator } from "./authz";

const candidateId = v.id("candidates");

type SourceEvidence = {
  url: string;
  label: string;
  excerpt: string;
};

type CandidateConflict = {
  field: "title" | "startAt" | "endAt" | "venue" | "city" | "status";
  values: string[];
  resolved: boolean;
  selectedValue?: string;
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

export const listReview = queryGeneric({
  args: {},
  handler: async (ctx) => {
    await requireOperator(ctx);
    const candidates = await ctx.db.query("candidates").take(100);
    return await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        sources: await ctx.db.query("sources").withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id)).collect(),
        images: await ctx.db.query("imageCandidates").withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id)).collect(),
      })),
    );
  },
});

export function isReadyForApproval(candidate: {
  status: string;
  conflicts: Array<{ resolved: boolean }>;
  importFindings?: string[];
}): boolean {
  return (
    candidate.status === "ready_for_review" &&
    candidate.conflicts.every((conflict) => conflict.resolved) &&
    (candidate.importFindings?.length ?? 0) === 0
  );
}

export function candidateStatusAfterConflictResolution(
  importFindings: string[],
  conflicts: Array<{ resolved: boolean }>,
): "ready_for_review" | "needs_attention" {
  return importFindings.length === 0 && conflicts.every((conflict) => conflict.resolved)
    ? "ready_for_review"
    : "needs_attention";
}

export function assertCandidateCanEnterDraft(candidate: {
  status: string;
  conflicts: Array<{ resolved: boolean }>;
  importFindings?: string[];
}): void {
  if (candidate.status !== "approved") throw new Error("Candidate is not approved");
  if (candidate.conflicts.some((conflict) => !conflict.resolved)) {
    throw new Error("Candidate has unresolved conflicts");
  }
  if ((candidate.importFindings?.length ?? 0) > 0) {
    throw new Error("Candidate has unresolved import findings");
  }
}

export const approve = mutationGeneric({
  args: { candidateId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found");
    if (!isReadyForApproval(candidate)) {
      throw new Error("Resolve conflicts and import findings before approval");
    }
    await ctx.db.patch(candidate._id, { status: "approved", updatedAt: Date.now() });
  },
});

export const reject = mutationGeneric({
  args: { candidateId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found");
    await ctx.db.patch(candidate._id, { status: "rejected", updatedAt: Date.now() });
  },
});

export const resolveConflict = mutationGeneric({
  args: {
    candidateId,
    field: v.union(v.literal("title"), v.literal("startAt"), v.literal("endAt"), v.literal("venue"), v.literal("city"), v.literal("status")),
    selectedValue: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("Candidate not found");
    const conflictsBefore = candidate.conflicts as CandidateConflict[];
    const conflict = conflictsBefore.find((item) => item.field === args.field && !item.resolved);
    if (!conflict || !conflict.values.includes(args.selectedValue)) {
      throw new Error("Selected value is not an unresolved source conflict");
    }
    const conflicts = conflictsBefore.map((item) =>
      item === conflict ? { ...item, resolved: true, selectedValue: args.selectedValue } : item,
    );
    const importFindings = ((candidate.importFindings ?? []) as string[]).filter(
      (finding) => finding !== "Material source conflict requires operator review",
    );
    const status = candidateStatusAfterConflictResolution(importFindings, conflicts);
    await ctx.db.patch(candidate._id, { conflicts, importFindings, status, updatedAt: Date.now() });
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
