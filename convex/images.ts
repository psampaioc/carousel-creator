import { queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOperator } from "./authz";

export const isApprovedDriveImage = queryGeneric({
  args: { fileId: v.string() },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const image = await ctx.db.query("imageCandidates").withIndex("by_drive_file_id", (q) => q.eq("driveFileId", args.fileId)).unique();
    if (!image) return false;
    const candidate = await ctx.db.get(image.candidateId);
    return Boolean(candidate && candidate.status === "approved" && !candidate.importFindings?.length && candidate.conflicts.every((conflict: { resolved: boolean }) => conflict.resolved));
  },
});
