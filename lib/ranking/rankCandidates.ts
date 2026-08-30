export type RankableCandidate = {
  _id: string;
  topicRelevance?: number;
  weekMatch?: boolean;
  geographyBand?: "coimbra" | "north" | "central" | "online";
  format: "in_person" | "online" | "hybrid";
};

export function compareCandidates(a: RankableCandidate, b: RankableCandidate): number {
  return (
    (b.topicRelevance ?? 0) - (a.topicRelevance ?? 0) ||
    Number(Boolean(b.weekMatch)) - Number(Boolean(a.weekMatch)) ||
    distanceBand(a) - distanceBand(b) ||
    a._id.localeCompare(b._id)
  );
}

export function distanceBand(candidate: RankableCandidate): number {
  switch (candidate.geographyBand) {
    case "coimbra":
      return 0;
    case "north":
      return 1;
    case "central":
      return 2;
    default:
      return 3;
  }
}

export function rankReason(candidate: RankableCandidate): string {
  const relevance = `${candidate.topicRelevance ?? 0}/100 relevance`;
  const week = candidate.weekMatch ? "this week" : "outside selected week";
  const area = candidate.geographyBand ?? "unclassified area";
  return `${relevance} · ${week} · ${area}`;
}
