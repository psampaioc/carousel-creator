"use client";

import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import { groupCandidates } from "@/lib/ranking/geographyFallback";
import { summarizeWorkspaceCandidates } from "@/lib/workspace/summary";

import { CandidateDetail, type ReviewCandidate } from "./CandidateDetail";
import { CandidateTable } from "./CandidateTable";

const groups = [
  ["coimbra", "Coimbra area", "Closest first once relevance and week match tie."],
  ["north", "Northern Portugal", "Wider-area suggestions for a sparse Coimbra week."],
  ["central", "Central Portugal", "Further fallback, including Aveiro."],
  ["online", "Online events", "Reserved for the final carousel slide; never mixed into in-person ranking."],
] as const;

export function ReviewQueue() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return <main className="review-shell"><p className="loading-note">Connecting your private workspace…</p></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="review-shell empty-review">
        <p className="eyebrow">Private workspace</p>
        <h1>Sign in to load the evidence queue.</h1>
        <p>Your Clerk session is not yet connected to the review workspace. Refresh after signing in to continue.</p>
      </main>
    );
  }

  return <AuthenticatedReviewQueue />;
}

function AuthenticatedReviewQueue() {
  const candidates = useQuery(api.candidates.listReview);
  const approve = useMutation(api.candidates.approve);
  const reject = useMutation(api.candidates.reject);
  const resolveConflict = useMutation(api.candidates.resolveConflict);
  const importSheet = useAction(api.sheetImportAction.importConfiguredSheet);
  const [selectedId, setSelectedId] = useState<string>();
  const [syncState, setSyncState] = useState<"syncing" | "complete" | "failed">("syncing");
  const [syncMessage, setSyncMessage] = useState<string>();
  const didStartSync = useRef(false);

  useEffect(() => {
    if (didStartSync.current) return;
    didStartSync.current = true;

    void importSheet({})
      .then((result) => {
        const rows = Array.isArray(result) ? result.length : 0;
        setSyncState("complete");
        setSyncMessage(`Sheet synchronized: ${rows} filled ${rows === 1 ? "row" : "rows"} found.`);
      })
      .catch((error) => {
        setSyncState("failed");
        setSyncMessage(
          error instanceof Error
            ? error.message
            : "The connected Sheet could not be synchronized.",
        );
      });
  }, [importSheet]);

  if (candidates === undefined) return <main className="review-shell"><p className="loading-note">Loading the evidence queue…</p></main>;
  const ranked = groupCandidates(candidates);
  const selected = candidates.find((candidate) => candidate._id === selectedId) ?? candidates[0];
  const summary = summarizeWorkspaceCandidates(candidates);

  if (candidates.length === 0) {
    return (
      <main className="review-shell workspace-empty">
        <section className="workspace-intro">
          <p className="eyebrow">This week’s carousel desk</p>
          <h1>{syncState === "syncing" ? "Checking your research sheet." : "Your research sheet is empty."}</h1>
          <p>
            {syncState === "syncing"
              ? "The workspace is pulling the connected Google Sheet now. It will show research rows here as soon as they arrive."
              : "Add research rows to the connected Google Sheet. Events with incomplete evidence will appear here for review instead of being used in a carousel."}
          </p>
          {syncMessage ? <p className={`sync-message is-${syncState}`}>{syncMessage}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="review-shell">
      <header className="review-header">
        <div><p className="eyebrow">This week’s carousel desk</p><h1>Choose what makes next week.</h1><p className="workspace-lede">Your Google Sheet syncs automatically when this workspace opens. Review the evidence below, then build only from approved events.</p></div>
        <div className="workspace-actions">
          <div className="queue-stats"><strong>{summary.total}</strong><span>filled Sheet rows</span><strong>{summary.approved}</strong><span>approved for carousel</span><strong>{summary.readyForReview}</strong><span>ready to review</span><strong>{summary.needsAttention}</strong><span>need attention</span></div>
          {summary.approved > 0 ? <Link className="button" href="/carousel">Create this week’s carousel</Link> : <p className="next-step">No approved events yet. Approve a complete event below to start the carousel.</p>}
          {syncMessage ? <p className={`sync-message is-${syncState}`}>{syncMessage}</p> : null}
        </div>
      </header>
      {ranked.isSparse ? <p className="sparse-note">Coimbra is sparse for this week. Wider-area options are shown separately below—nothing is being passed off as local.</p> : null}
      <section className="review-layout">
        <div className="review-groups">
          {groups.map(([key, title, detail]) => {
            const candidatesInGroup = ranked[key];
            if (!candidatesInGroup.length) return null;
            return <section className="review-group" key={key}><div className="group-heading"><div><p className="section-kicker">{key === "online" ? "Separate pool" : "Geographic band"}</p><h2>{title}</h2></div><p>{detail}</p></div><CandidateTable candidates={candidatesInGroup} selectedId={selected?._id} onSelect={setSelectedId} /></section>;
          })}
        </div>
        {selected ? <CandidateDetail candidate={selected as ReviewCandidate} approve={approve} reject={reject} resolveConflict={resolveConflict} /> : null}
      </section>
    </main>
  );
}
