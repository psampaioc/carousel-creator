export type DraftCandidate = {
  _id: string;
  title: string;
  format: "in_person" | "online" | "hybrid";
  status: string;
  conflicts: Array<{ resolved: boolean }>;
  importFindings?: string[];
  sourceIds: string[];
  imageCandidateIds: string[];
};

export function assertDraftCandidate(candidate: DraftCandidate): void {
  if (candidate.status !== "approved") throw new Error("Only approved candidates can enter a draft");
  if (candidate.conflicts.some((conflict) => !conflict.resolved)) throw new Error("Candidate has unresolved conflicts");
  if (candidate.importFindings?.length) throw new Error("Candidate has unresolved import findings");
  if (!candidate.sourceIds.length) throw new Error("Candidate has no source evidence");
}

export function selectWeeklyCandidates<T extends DraftCandidate>(candidates: T[]) {
  const online = candidates.filter((candidate) => candidate.format === "online").slice(0, 5);
  const inPersonLimit = online.length ? 8 : 9;
  const inPerson = candidates.filter((candidate) => candidate.format !== "online").slice(0, inPersonLimit);
  return { inPerson, online };
}

export function totalSlideCount(inPersonCount: number, onlineCount: number): number {
  return 1 + Math.min(inPersonCount, 9) + (onlineCount ? 1 : 0);
}
