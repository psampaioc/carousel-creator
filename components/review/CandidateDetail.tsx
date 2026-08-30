"use client";

import type { Id } from "@/convex/_generated/dataModel";

import { ConflictAlert } from "./ConflictAlert";

export type ReviewCandidate = {
  _id: Id<"candidates">;
  title: string;
  startAt?: number;
  venue?: string;
  city?: string;
  status: "imported" | "needs_attention" | "ready_for_review" | "approved" | "rejected";
  importFindings?: string[];
  conflicts: Array<{ field: string; values: string[]; resolved: boolean; selectedValue?: string }>;
  sources: Array<{ _id: Id<"sources">; label: string; url: string; excerpt: string; isOfficial: boolean }>;
  images: Array<{ _id: Id<"imageCandidates">; provenance: "official" | "announcement" | "generated"; sourceUrl: string; driveFileId: string }>;
};

export function CandidateDetail({
  candidate,
  resolveConflict,
  approve,
  reject,
}: {
  candidate: ReviewCandidate;
  resolveConflict: (args: { candidateId: Id<"candidates">; field: "title" | "startAt" | "endAt" | "venue" | "city" | "status"; selectedValue: string }) => Promise<unknown>;
  approve: (args: { candidateId: Id<"candidates"> }) => Promise<unknown>;
  reject: (args: { candidateId: Id<"candidates"> }) => Promise<unknown>;
}) {
  const unresolved = candidate.conflicts.some((conflict) => !conflict.resolved);
  const canApprove = candidate.status === "ready_for_review" && !unresolved && !candidate.importFindings?.length;

  return (
    <aside className="candidate-detail">
      <div className="detail-heading">
        <div>
          <p className="section-kicker">Evidence file</p>
          <h2>{candidate.title}</h2>
        </div>
        <span className={`status status-${candidate.status}`}>{candidate.status.replaceAll("_", " ")}</span>
      </div>

      <dl className="event-facts">
        <div><dt>When</dt><dd>{candidate.startAt ? new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short" }).format(candidate.startAt) : "Date not supported"}</dd></div>
        <div><dt>Where</dt><dd>{[candidate.venue, candidate.city].filter(Boolean).join(" · ") || "Location not supported"}</dd></div>
      </dl>

      <ConflictAlert candidateId={candidate._id} conflicts={candidate.conflicts} resolve={resolveConflict} />

      {candidate.importFindings?.length ? (
        <section className="findings"><p className="section-kicker">Needs attention</p><ul>{candidate.importFindings.map((finding) => <li key={finding}>{finding}</li>)}</ul></section>
      ) : null}

      <section className="evidence-section">
        <p className="section-kicker">Sources</p>
        {candidate.sources.length ? candidate.sources.map((source) => (
          <a className="source-card" href={source.url} key={source._id} rel="noreferrer" target="_blank">
            <span>{source.isOfficial ? "Official source" : "Source"}</span><strong>{source.label}</strong><small>{source.excerpt}</small>
          </a>
        )) : <p>No source records imported.</p>}
      </section>

      <section className="evidence-section">
        <p className="section-kicker">Image options</p>
        {candidate.images.length ? candidate.images.map((image) => (
          <a className="image-option" href={image.sourceUrl} key={image._id} rel="noreferrer" target="_blank">
            <span className={`provenance provenance-${image.provenance}`}>{image.provenance}</span>
            <small>Drive file {image.driveFileId}</small>
          </a>
        )) : <p>No image candidates imported.</p>}
      </section>

      <div className="detail-actions">
        <button className="button" disabled={!canApprove} onClick={() => approve({ candidateId: candidate._id })}>Approve for draft</button>
        <button className="text-button danger" disabled={candidate.status === "rejected"} onClick={() => reject({ candidateId: candidate._id })}>Reject event</button>
      </div>
      {!canApprove && candidate.status !== "approved" && candidate.status !== "rejected" ? <p className="action-note">Approval unlocks only after every import finding and conflict is resolved.</p> : null}
    </aside>
  );
}
