import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { requireOperator } from "./authz";

const candidateId = v.id("candidates");
const draftId = v.id("drafts");
const slideId = v.id("draftSlides");

function assertEligible(candidate: { status: string; conflicts: Array<{ resolved: boolean }>; importFindings?: string[]; sourceIds: unknown[] }) {
  if (candidate.status !== "approved") throw new Error("Only approved candidates can enter a draft");
  if (candidate.conflicts.some((conflict) => !conflict.resolved)) throw new Error("Candidate has unresolved conflicts");
  if (candidate.importFindings?.length) throw new Error("Candidate has unresolved import findings");
  if (!candidate.sourceIds.length) throw new Error("Candidate has no source evidence");
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
    const id = await ctx.db.insert("drafts", { ...args, status: "editing", needsFinalReview: false, updatedAt: now });
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
    return { draft, slides: slides.sort((a, b) => a.position - b.position) };
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
    const factualReviewRequired = Boolean(slide.candidateId && (slide.title !== args.title || slide.body !== args.body));
    const { slideId: _slideId, ...changes } = args;
    void _slideId;
    await ctx.db.patch(slide._id, { ...changes, factualReviewRequired, updatedAt: Date.now() });
  },
});
