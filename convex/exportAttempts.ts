import { internalMutationGeneric, mutationGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOperator } from "./authz";
import { EXPORT_ATTEMPT_TIMEOUT_MS } from "../lib/carousel/exportAttempt";

const draftId = v.id("drafts");
const attemptId = v.id("draftExportAttempts");

export const start = mutationGeneric({
  args: { draftId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const draft = await ctx.db.get(args.draftId);
    if (!draft) throw new Error("Draft not found");
    const now = Date.now();
    const attempts = (await ctx.db.query("draftExportAttempts").withIndex("by_draft_revision", (q) => q.eq("draftId", args.draftId)).collect()).filter((attempt) => attempt.revision === draft.revision);
    const active = attempts.find((attempt) => attempt.status === "active");
    if (active && now - active.updatedAt < EXPORT_ATTEMPT_TIMEOUT_MS) {
      return { status: "active" as const, attemptId: active._id };
    }
    if (active) await ctx.db.patch(active._id, { status: "failed", updatedAt: now });
    const id = await ctx.db.insert("draftExportAttempts", { draftId: args.draftId, revision: draft.revision, status: "active", createdAt: now, updatedAt: now });
    return { status: "started" as const, attemptId: id };
  },
});

export const fail = mutationGeneric({
  args: { attemptId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const attempt = await ctx.db.get(args.attemptId);
    if (attempt?.status === "active") await ctx.db.patch(attempt._id, { status: "failed", updatedAt: Date.now() });
  },
});

export const setFolder = internalMutationGeneric({
  args: { attemptId, folderId: v.string() },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.status !== "active") throw new Error("Export attempt is no longer active");
    if (attempt.folderId) return attempt.folderId;
    await ctx.db.patch(attempt._id, { folderId: args.folderId, updatedAt: Date.now() });
    return args.folderId;
  },
});
