"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { rankReason } from "@/lib/ranking/rankCandidates";

type Candidate = {
  _id: Id<"candidates">;
  title: string;
  format: "in_person" | "online" | "hybrid";
  status: "imported" | "needs_attention" | "ready_for_review" | "approved" | "rejected";
  topicRelevance?: number;
  weekMatch?: boolean;
  geographyBand?: "coimbra" | "north" | "central" | "online";
  conflicts: Array<{ resolved: boolean }>;
  importFindings?: string[];
};

export function CandidateTable({ candidates, selectedId, onSelect }: { candidates: Candidate[]; selectedId?: Id<"candidates">; onSelect: (id: Id<"candidates">) => void }) {
  return (
    <div className="candidate-list">
      {candidates.map((candidate) => {
        const alertCount = candidate.conflicts.filter((conflict) => !conflict.resolved).length + (candidate.importFindings?.length ?? 0);
        return (
          <button className={`candidate-row ${selectedId === candidate._id ? "is-selected" : ""}`} key={candidate._id} onClick={() => onSelect(candidate._id)}>
            <span className="candidate-rank">{candidate.topicRelevance ?? 0}</span>
            <span className="candidate-copy"><strong>{candidate.title}</strong><small>{rankReason(candidate)}</small></span>
            <span className={`status status-${candidate.status}`}>{alertCount ? `${alertCount} flag${alertCount > 1 ? "s" : ""}` : candidate.status.replaceAll("_", " ")}</span>
          </button>
        );
      })}
    </div>
  );
}
