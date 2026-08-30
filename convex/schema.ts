import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { candidateStatusValidator } from "./validation";

const conflictValidator = v.object({
  field: v.union(
    v.literal("title"),
    v.literal("startAt"),
    v.literal("endAt"),
    v.literal("venue"),
    v.literal("city"),
    v.literal("status"),
  ),
  values: v.array(v.string()),
  resolved: v.boolean(),
  selectedValue: v.optional(v.string()),
});

const slideKindValidator = v.union(v.literal("cover"), v.literal("event"), v.literal("online"));

export default defineSchema({
  candidates: defineTable({
    externalRowId: v.optional(v.string()),
    researchRunId: v.optional(v.string()),
    title: v.string(),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    venue: v.optional(v.string()),
    city: v.optional(v.string()),
    format: v.union(v.literal("in_person"), v.literal("online"), v.literal("hybrid")),
    status: candidateStatusValidator,
    topicRelevance: v.optional(v.number()),
    weekMatch: v.optional(v.boolean()),
    geographyBand: v.optional(
      v.union(v.literal("coimbra"), v.literal("north"), v.literal("central"), v.literal("online")),
    ),
    importFindings: v.optional(v.array(v.string())),
    conflicts: v.array(conflictValidator),
    sourceIds: v.array(v.id("sources")),
    imageCandidateIds: v.array(v.id("imageCandidates")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_external_row_id", ["externalRowId"]),

  sources: defineTable({
    candidateId: v.id("candidates"),
    externalSourceId: v.optional(v.string()),
    url: v.string(),
    label: v.string(),
    excerpt: v.string(),
    collectedAt: v.number(),
    isOfficial: v.boolean(),
  }).index("by_candidate", ["candidateId"]),

  supportedFacts: defineTable({
    candidateId: v.id("candidates"),
    field: v.union(
      v.literal("title"),
      v.literal("startAt"),
      v.literal("endAt"),
      v.literal("venue"),
      v.literal("city"),
      v.literal("status"),
    ),
    value: v.string(),
    sourceIds: v.array(v.id("sources")),
  }).index("by_candidate", ["candidateId"]),

  imageCandidates: defineTable({
    candidateId: v.id("candidates"),
    driveFileId: v.string(),
    sourceUrl: v.string(),
    provenance: v.union(
      v.literal("official"),
      v.literal("announcement"),
      v.literal("generated"),
    ),
    collectedAt: v.number(),
    sortOrder: v.optional(v.number()),
  }).index("by_candidate", ["candidateId"]),

  drafts: defineTable({
    weekStart: v.string(),
    status: v.union(v.literal("editing"), v.literal("ready"), v.literal("exported")),
    candidateIds: v.array(v.id("candidates")),
    onlineCandidateIds: v.array(v.id("candidates")),
    needsFinalReview: v.boolean(),
    updatedAt: v.number(),
  }).index("by_week_start", ["weekStart"]),

  draftSlides: defineTable({
    draftId: v.id("drafts"),
    kind: slideKindValidator,
    position: v.number(),
    candidateId: v.optional(v.id("candidates")),
    title: v.string(),
    body: v.string(),
    imageCandidateId: v.optional(v.id("imageCandidates")),
    template: v.union(v.literal("coimbra-grid"), v.literal("poster-frame")),
    accent: v.string(),
    shape: v.union(v.literal("arc"), v.literal("square"), v.literal("circle")),
    factualReviewRequired: v.boolean(),
    finalReviewComplete: v.boolean(),
    updatedAt: v.number(),
  }).index("by_draft", ["draftId"]),
});
