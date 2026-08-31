import { internalMutationGeneric } from "convex/server";
import { v } from "convex/values";

export const record = internalMutationGeneric({
  args: { draftId: v.id("drafts"), attemptId: v.id("draftExportAttempts"), position: v.number(), fileId: v.string(), folderId: v.string(), filename: v.string(), revision: v.number() },
  handler: async (ctx, args) => {
    const existing = (await ctx.db.query("draftExportFiles").withIndex("by_attempt_position", (q) => q.eq("attemptId", args.attemptId)).collect()).find((file) => file.position === args.position);
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, uploadedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("draftExportFiles", { ...args, uploadedAt: Date.now() });
  },
});
