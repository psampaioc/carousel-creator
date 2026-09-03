export type WorkspaceCandidate = {
  status: string;
};

export type WorkspaceSummary = {
  total: number;
  approved: number;
  readyForReview: number;
  needsAttention: number;
};

export function summarizeWorkspaceCandidates(
  candidates: WorkspaceCandidate[],
): WorkspaceSummary {
  return candidates.reduce<WorkspaceSummary>(
    (summary, candidate) => ({
      ...summary,
      total: summary.total + 1,
      approved: summary.approved + Number(candidate.status === "approved"),
      readyForReview:
        summary.readyForReview + Number(candidate.status === "ready_for_review"),
      needsAttention:
        summary.needsAttention + Number(candidate.status === "needs_attention"),
    }),
    { total: 0, approved: 0, readyForReview: 0, needsAttention: 0 },
  );
}
