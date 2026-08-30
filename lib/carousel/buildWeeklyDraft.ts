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

const provenanceOrder = { official: 0, announcement: 1, generated: 2 } as const;

export function orderImageCandidates<T extends { provenance: keyof typeof provenanceOrder; sortOrder?: number }>(images: T[]): T[] {
  return [...images].sort((left, right) => {
    if (left.sortOrder !== undefined || right.sortOrder !== undefined) {
      return (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);
    }
    return provenanceOrder[left.provenance] - provenanceOrder[right.provenance];
  });
}

export function reorderEventSlides<T>(orderedIds: T[], targetId: T, direction: "up" | "down"): T[] {
  const next = [...orderedIds];
  const index = next.indexOf(targetId);
  const minimum = 1;
  const maximum = Math.max(minimum, next.length - 2);
  const destination = direction === "up" ? index - 1 : index + 1;
  if (index < minimum || index > maximum || destination < minimum || destination > maximum) return next;
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}
