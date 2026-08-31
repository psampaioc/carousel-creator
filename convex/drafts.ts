import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOperator } from "./authz";
import type { Id } from "./_generated/dataModel";
import { assertExportableDraft } from "../lib/carousel/exportGuards";
import { isDriveFileId } from "../lib/drive/mediaCatalog";

const candidateId = v.id("candidates");
const draftId = v.id("drafts");
const slideId = v.id("draftSlides");

function assertEligible(candidate: { status: string; conflicts: Array<{ resolved: boolean }>; importFindings?: string[]; sourceIds: unknown[] }) {
  if (candidate.status !== "approved") throw new Error("Only approved candidates can enter a draft");
  if (candidate.conflicts.some((conflict) => !conflict.resolved)) throw new Error("Candidate has unresolved conflicts");
  if (candidate.importFindings?.length) throw new Error("Candidate has unresolved import findings");
  if (!candidate.sourceIds.length) throw new Error("Candidate has no source evidence");
}

async function assertSelectedSlideImages(
  ctx: { db: { get: (id: Id<"imageCandidates">) => Promise<{ candidateId: Id<"candidates">; driveFileId: string } | null> } },
  slides: Array<{ kind: string; candidateId?: Id<"candidates">; imageCandidateId?: Id<"imageCandidates"> }>,
) {
  for (const slide of slides) {
    if (slide.kind !== "event" || !slide.candidateId || !slide.imageCandidateId) {
      if (slide.kind === "event") throw new Error("Every event slide needs a selected image");
      continue;
    }
    const image = await ctx.db.get(slide.imageCandidateId);
    if (!image || image.candidateId !== slide.candidateId || !isDriveFileId(image.driveFileId)) {
      throw new Error("Every event slide needs an available selected image");
    }
  }
}

export const listEligible = queryGeneric({
  args: {},
  handler: async (ctx) => {
    await requireOperator(ctx);
    const candidates = await ctx.db.query("candidates").filter((q) => q.eq(q.field("status"), "approved")).take(100);
    return await Promise.all(candidates.map(async (candidate) => ({
      ...candidate,
      images: await ctx.db.query("imageCandidates").withIndex("by_candidate", (q) => q.eq("candidateId", candidate._id)).collect(),
    })));
  },
});

export const create = mutationGeneric({
  args: { weekStart: v.string(), candidateIds: v.array(candidateId), onlineCandidateIds: v.array(candidateId) },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.weekStart)) throw new Error("Week start must be YYYY-MM-DD");
    if (args.candidateIds.length > 9) throw new Error("A draft can contain at most nine in-person events");
    if (args.onlineCandidateIds.length > 5) throw new Error("A draft can contain at most five online events");
    if (args.onlineCandidateIds.length && args.candidateIds.length > 8) {
      throw new Error("An online final slide leaves room for at most eight in-person events");
    }
    const selectedIds = [...args.candidateIds, ...args.onlineCandidateIds];
    if (new Set(selectedIds).size !== selectedIds.length) throw new Error("A candidate can appear only once in a draft");
    const selected = await Promise.all(selectedIds.map((id) => ctx.db.get(id)));
    if (selected.some((candidate) => !candidate)) throw new Error("Candidate not found");
    for (const candidate of selected) assertEligible(candidate!);
    for (const candidate of await Promise.all(args.candidateIds.map((id) => ctx.db.get(id)))) {
      if (candidate?.format === "online") throw new Error("Online events belong on the final slide");
    }
    for (const candidate of await Promise.all(args.onlineCandidateIds.map((id) => ctx.db.get(id)))) {
      if (candidate?.format !== "online") throw new Error("Only online events belong on the online slide");
    }
    const now = Date.now();
    const existing = await ctx.db.query("drafts").withIndex("by_week_start", (q) => q.eq("weekStart", args.weekStart)).unique();
    if (existing) throw new Error("A weekly draft already exists for this Monday");
    const id = await ctx.db.insert("drafts", { ...args, status: "editing", needsFinalReview: false, revision: 1, updatedAt: now });
    await ctx.db.insert("draftSlides", { draftId: id, kind: "cover", position: 0, title: "Coimbra / next week", body: "Engineering, technology and ideas worth leaving the house for.", template: "coimbra-grid", accent: "#236b4b", shape: "arc", factualReviewRequired: false, finalReviewComplete: true, updatedAt: now });
    for (const [index, candidateId] of args.candidateIds.entries()) {
      const candidate = selected.find((item) => item?._id === candidateId)!;
      await ctx.db.insert("draftSlides", { draftId: id, kind: "event", position: index + 1, candidateId, title: candidate!.title, body: [candidate!.venue, candidate!.city].filter(Boolean).join(" · ") || "Details in the source links.", imageCandidateId: candidate!.imageCandidateIds[0], template: "coimbra-grid", accent: "#236b4b", shape: "arc", factualReviewRequired: false, finalReviewComplete: true, updatedAt: now });
    }
    if (args.onlineCandidateIds.length) await ctx.db.insert("draftSlides", { draftId: id, kind: "online", position: args.candidateIds.length + 1, title: "Online, wherever you are", body: "Up to five selected online events.", template: "poster-frame", accent: "#17362d", shape: "circle", factualReviewRequired: false, finalReviewComplete: true, updatedAt: now });
    return id;
  },
});

export const get = queryGeneric({
  args: { draftId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const draft = await ctx.db.get(args.draftId);
    if (!draft) return null;
    const slides = await ctx.db.query("draftSlides").withIndex("by_draft", (q) => q.eq("draftId", args.draftId)).collect();
    const enrichedSlides = await Promise.all(slides.map(async (slide) => ({
      ...slide,
      images: slide.candidateId
        ? (await ctx.db.query("imageCandidates").withIndex("by_candidate", (q) => q.eq("candidateId", slide.candidateId!)).collect())
          .sort((left, right) => {
            const provenance: Record<string, number> = { official: 0, announcement: 1, generated: 2 };
            if (left.sortOrder !== undefined || right.sortOrder !== undefined) return (left.sortOrder ?? 999) - (right.sortOrder ?? 999);
            return provenance[left.provenance] - provenance[right.provenance];
          })
        : [],
    })));
    const onlineEvents = (await Promise.all(draft.onlineCandidateIds.map(async (id: Id<"candidates">) => {
      const candidate = await ctx.db.get(id);
      if (!candidate) return null;
      const sources = await ctx.db.query("sources").withIndex("by_candidate", (q) => q.eq("candidateId", id)).collect();
      return { _id: candidate._id, title: candidate.title, startAt: candidate.startAt, sources };
    }))).filter((event) => event !== null);
    return { draft, slides: enrichedSlides.sort((a, b) => a.position - b.position), onlineEvents };
  },
});

export const updateSlide = mutationGeneric({
  args: { slideId, title: v.string(), body: v.string(), template: v.union(v.literal("coimbra-grid"), v.literal("poster-frame")), accent: v.string(), shape: v.union(v.literal("arc"), v.literal("square"), v.literal("circle")), imageCandidateId: v.optional(v.id("imageCandidates")), finalReviewComplete: v.boolean() },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const slide = await ctx.db.get(args.slideId);
    if (!slide) throw new Error("Slide not found");
    if (args.imageCandidateId && !slide.candidateId) throw new Error("Only event slides can choose an image");
    if (args.imageCandidateId) {
      const image = await ctx.db.get(args.imageCandidateId);
      if (!image || image.candidateId !== slide.candidateId) throw new Error("Image does not belong to this event");
    }
    const factualCopyChanged = Boolean(slide.candidateId && (slide.title !== args.title || slide.body !== args.body));
    const factualReviewRequired = slide.factualReviewRequired || factualCopyChanged;
    const { slideId: _slideId, ...changes } = args;
    void _slideId;
    await ctx.db.patch(slide._id, {
      ...changes,
      factualReviewRequired,
      finalReviewComplete: factualReviewRequired ? false : changes.finalReviewComplete,
      updatedAt: Date.now(),
    });
    const draft = await ctx.db.get(slide.draftId);
    if (!draft) throw new Error("Draft not found");
    await ctx.db.patch(slide.draftId, { needsFinalReview: factualReviewRequired ? true : draft.needsFinalReview, status: "editing", revision: draft.revision + 1, updatedAt: Date.now() });
  },
});

export const moveSlide = mutationGeneric({
  args: { slideId, direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const slide = await ctx.db.get(args.slideId);
    if (!slide || slide.kind !== "event") throw new Error("Only event slides can be reordered");
    const slides = (await ctx.db.query("draftSlides").withIndex("by_draft", (q) => q.eq("draftId", slide.draftId)).collect()).sort((a, b) => a.position - b.position);
    const eventSlides = slides.filter((item) => item.kind === "event");
    const index = eventSlides.findIndex((item) => item._id === slide._id);
    const destination = args.direction === "up" ? index - 1 : index + 1;
    if (destination < 0 || destination >= eventSlides.length) return;
    const adjacent = eventSlides[destination];
    await ctx.db.patch(slide._id, { position: adjacent.position, updatedAt: Date.now() });
    await ctx.db.patch(adjacent._id, { position: slide.position, updatedAt: Date.now() });
    const draft = await ctx.db.get(slide.draftId);
    if (!draft) throw new Error("Draft not found");
    await ctx.db.patch(slide.draftId, { status: "editing", revision: draft.revision + 1, updatedAt: Date.now() });
  },
});

export const completeSlideReview = mutationGeneric({
  args: { slideId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const slide = await ctx.db.get(args.slideId);
    if (!slide) throw new Error("Slide not found");
    await ctx.db.patch(slide._id, { factualReviewRequired: false, finalReviewComplete: true, updatedAt: Date.now() });
    const slides = await ctx.db.query("draftSlides").withIndex("by_draft", (q) => q.eq("draftId", slide.draftId)).collect();
    const hasPendingReview = slides.some((item) => item._id !== slide._id && item.factualReviewRequired && !item.finalReviewComplete);
    const draft = await ctx.db.get(slide.draftId);
    if (!draft) throw new Error("Draft not found");
    await ctx.db.patch(slide.draftId, { needsFinalReview: hasPendingReview, status: "editing", revision: draft.revision + 1, updatedAt: Date.now() });
  },
});

export const getExportManifest = queryGeneric({
  args: { draftId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const draft = await ctx.db.get(args.draftId);
    if (!draft) throw new Error("Draft not found");
    const slides = (await ctx.db.query("draftSlides").withIndex("by_draft", (q) => q.eq("draftId", args.draftId)).collect()).sort((a, b) => a.position - b.position);
    if (!slides.length || slides.length > 10) throw new Error("Draft must contain between one and ten slides");
    const selectedIds = [...draft.candidateIds, ...draft.onlineCandidateIds];
    const selected = await Promise.all(selectedIds.map((id) => ctx.db.get(id)));
    if (selected.some((candidate) => !candidate)) throw new Error("A selected event is missing");
    assertExportableDraft({
      needsFinalReview: draft.needsFinalReview,
      slides: slides.map((slide) => ({
        kind: slide.kind,
        position: slide.position,
        candidateId: slide.candidateId ? String(slide.candidateId) : undefined,
        imageCandidateId: slide.imageCandidateId ? String(slide.imageCandidateId) : undefined,
        finalReviewComplete: slide.finalReviewComplete,
      })),
      candidates: selected.map((candidate) => ({
        _id: String(candidate!._id),
        status: candidate!.status,
        conflicts: candidate!.conflicts,
        importFindings: candidate!.importFindings,
        sourceIds: candidate!.sourceIds.map(String),
        imageCandidateIds: candidate!.imageCandidateIds.map(String),
      })),
    });
    await assertSelectedSlideImages(ctx, slides);
    return { weekStart: draft.weekStart, slideCount: slides.length, revision: draft.revision };
  },
});

export const markExported = mutationGeneric({
  args: { draftId },
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    const draft = await ctx.db.get(args.draftId);
    if (!draft) throw new Error("Draft not found");
    const slides = await ctx.db.query("draftSlides").withIndex("by_draft", (q) => q.eq("draftId", args.draftId)).collect();
    const exportFiles = (await ctx.db.query("draftExportFiles").withIndex("by_draft", (q) => q.eq("draftId", args.draftId)).collect()).filter((file) => file.revision === draft.revision).sort((a, b) => a.position - b.position);
    if (exportFiles.length !== slides.length || exportFiles.some((file, position) => file.position !== position)) throw new Error("Every slide must upload before export completes");
    if (draft.needsFinalReview || slides.some((slide) => !slide.finalReviewComplete)) throw new Error("Complete factual review before export");
    const selected = await Promise.all([...draft.candidateIds, ...draft.onlineCandidateIds].map((id) => ctx.db.get(id)));
    if (selected.some((candidate) => !candidate)) throw new Error("A selected event is missing");
    for (const candidate of selected) assertEligible(candidate!);
    for (const slide of slides.filter((item) => item.kind === "event")) {
      const candidate = selected.find((item) => item?._id === slide.candidateId);
      if (!slide.imageCandidateId || !candidate?.imageCandidateIds.includes(slide.imageCandidateId)) throw new Error("Every event slide needs a valid selected image");
    }
    await assertSelectedSlideImages(ctx, slides);
    const folderIds = new Set(exportFiles.map((file) => file.folderId));
    if (folderIds.size !== 1) throw new Error("Exported slides must share one Drive folder");
    await ctx.db.patch(args.draftId, { status: "exported", exportedFileIds: exportFiles.map((file) => file.fileId), exportFolderId: exportFiles[0].folderId, updatedAt: Date.now() });
  },
});
