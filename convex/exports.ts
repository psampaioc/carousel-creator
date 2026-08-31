"use node";

import { actionGeneric } from "convex/server";
import { v } from "convex/values";

import { exportFilename } from "../lib/carousel/exportGuards";
import { api, internal } from "./_generated/api";
import { requireOperator } from "./authz";
import { ensureWeekExportFolder, googleExportAccessToken, uploadPngToDrive } from "./driveMedia";

export const uploadSlide = actionGeneric({
  args: { draftId: v.id("drafts"), attemptId: v.id("draftExportAttempts"), position: v.number(), pngBase64: v.string() },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const manifest = await ctx.runQuery(api.drafts.getExportManifest, { draftId: args.draftId, attemptId: args.attemptId });
    if (!Number.isInteger(args.position) || args.position < 0 || args.position >= manifest.slideCount) {
      throw new Error("Export position is outside this draft");
    }
    if (args.pngBase64.length > 4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(args.pngBase64)) throw new Error("Rendered slide exceeds the 3 MB safe upload limit");
    const bytes = Buffer.from(args.pngBase64, "base64");
    if (bytes.length > 3_000_000 || bytes.toString("base64") !== args.pngBase64) throw new Error("Rendered slide exceeds the 3 MB safe upload limit");
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 24 || signature.some((byte, index) => bytes[index] !== byte)) throw new Error("Rendered slide is not a PNG");
    if (bytes.readUInt32BE(16) !== 1080 || bytes.readUInt32BE(20) !== 1350) throw new Error("Rendered slide must be 1080 by 1350 pixels");
    const token = await googleExportAccessToken();
    const createdFolderId = manifest.folderId ?? await ensureWeekExportFolder(manifest.weekStart, token);
    const folderId: string = await ctx.runMutation(internal.exportAttempts.setFolder, { attemptId: args.attemptId, folderId: createdFolderId }) as string;
    const filename = exportFilename(manifest.weekStart, args.position);
    const fileId = await uploadPngToDrive(folderId, filename, bytes, token);
    await ctx.runMutation(internal.exportRecords.record, { draftId: args.draftId, attemptId: args.attemptId, position: args.position, fileId, folderId, filename, revision: manifest.revision });
    return { fileId, filename, folderId };
  },
});
