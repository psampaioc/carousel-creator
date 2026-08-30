import { v } from "convex/values";

export const candidateStatuses = [
  "imported",
  "needs_attention",
  "ready_for_review",
  "approved",
  "rejected",
] as const;

export type CandidateStatus = (typeof candidateStatuses)[number];

export const candidateStatusValidator = v.union(
  ...candidateStatuses.map((status) => v.literal(status)),
);

export function assertCandidateStatus(value: string): CandidateStatus {
  if (!candidateStatuses.includes(value as CandidateStatus)) {
    throw new Error(`Invalid candidate status: ${value}`);
  }

  return value as CandidateStatus;
}
