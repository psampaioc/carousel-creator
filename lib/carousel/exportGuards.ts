type ExportCandidate = {
  _id: string;
  status: string;
  conflicts: Array<{ resolved?: boolean }>;
  importFindings?: string[];
  sourceIds: string[];
  imageCandidateIds: string[];
};

type ExportSlide = {
  kind: "cover" | "event" | "online";
  position: number;
  candidateId?: string;
  imageCandidateId?: string;
  finalReviewComplete: boolean;
};

export type ExportDraft = {
  needsFinalReview: boolean;
  slides: ExportSlide[];
  candidates: ExportCandidate[];
};

export function assertExportableDraft(draft: ExportDraft): void {
  if (draft.needsFinalReview || draft.slides.some((slide) => !slide.finalReviewComplete)) {
    throw new Error("Complete factual review before export");
  }
  for (const candidate of draft.candidates) {
    if (candidate.status !== "approved") throw new Error("A selected event is no longer approved");
    if (candidate.conflicts.some((conflict) => !conflict.resolved)) throw new Error("A selected event has unresolved conflicts");
    if (candidate.importFindings?.length || !candidate.sourceIds.length) throw new Error("A selected event has invalid source evidence");
  }
  for (const slide of draft.slides.filter((item) => item.kind === "event")) {
    const candidate = draft.candidates.find((item) => item._id === slide.candidateId);
    if (!candidate) throw new Error("A selected event is no longer approved");
    if (!slide.imageCandidateId || !candidate.imageCandidateIds.includes(slide.imageCandidateId)) throw new Error("Every event slide needs a valid selected image");
  }
}

export function exportFilename(weekStart: string, position: number): string {
  return `${weekStart}-coimbra-events-${String(position + 1).padStart(2, "0")}.png`;
}
