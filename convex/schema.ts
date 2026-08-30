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
});

export default defineSchema({
  candidates: defineTable({
    title: v.string(),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    venue: v.optional(v.string()),
    city: v.optional(v.string()),
    format: v.union(v.literal("in_person"), v.literal("online"), v.literal("hybrid")),
    status: candidateStatusValidator,
    conflicts: v.array(conflictValidator),
    sourceIds: v.array(v.id("sources")),
    imageCandidateIds: v.array(v.id("imageCandidates")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  sources: defineTable({
    candidateId: v.id("candidates"),
    url: v.string(),
    label: v.string(),
    excerpt: v.string(),
    collectedAt: v.number(),
    isOfficial: v.boolean(),
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
  }).index("by_candidate", ["candidateId"]),

  drafts: defineTable({
    weekStart: v.string(),
    status: v.union(v.literal("editing"), v.literal("ready"), v.literal("exported")),
    candidateIds: v.array(v.id("candidates")),
    onlineCandidateIds: v.array(v.id("candidates")),
    updatedAt: v.number(),
  }).index("by_week_start", ["weekStart"]),
});
