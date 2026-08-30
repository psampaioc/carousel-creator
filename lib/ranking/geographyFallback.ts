import { compareCandidates, type RankableCandidate } from "./rankCandidates";

export type ReviewGroups<T extends RankableCandidate> = {
  coimbra: T[];
  north: T[];
  central: T[];
  online: T[];
  isSparse: boolean;
};

export function groupCandidates<T extends RankableCandidate>(candidates: T[]): ReviewGroups<T> {
  const groups: ReviewGroups<T> = { coimbra: [], north: [], central: [], online: [], isSparse: true };

  for (const candidate of candidates) {
    if (candidate.format === "online" || candidate.geographyBand === "online") groups.online.push(candidate);
    else if (candidate.geographyBand === "north") groups.north.push(candidate);
    else if (candidate.geographyBand === "central") groups.central.push(candidate);
    else groups.coimbra.push(candidate);
  }

  for (const group of [groups.coimbra, groups.north, groups.central, groups.online]) {
    group.sort(compareCandidates);
  }
  groups.isSparse = groups.coimbra.filter((candidate) => candidate.weekMatch).length < 9;
  return groups;
}
