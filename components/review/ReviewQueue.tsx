"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import { api } from "@/convex/_generated/api";
import { groupCandidates } from "@/lib/ranking/geographyFallback";

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
  const [selectedId, setSelectedId] = useState<string>();

  if (candidates === undefined) return <main className="review-shell"><p className="loading-note">Loading the evidence queue…</p></main>;
  const ranked = groupCandidates(candidates);
  const selected = candidates.find((candidate) => candidate._id === selectedId) ?? candidates[0];

  if (candidates.length === 0) {
    return <main className="review-shell empty-review"><p className="eyebrow">Editorial review</p><h1>Your evidence queue is ready.</h1><p>Import a research row from the Google Sheet to see its source trail, ranking, conflicts, and image options here.</p><div className="empty-rule"><span>1</span> Capture sources <span>2</span> Import safely <span>3</span> Review deliberately</div></main>;
  }

  return (
    <main className="review-shell">
      <header className="review-header">
        <div><p className="eyebrow">Editorial review · next calendar week</p><h1>Choose events you can stand behind.</h1></div>
        <div><div className="queue-stats"><strong>{candidates.length}</strong><span>researched events</span><strong>{ranked.coimbra.filter((candidate) => candidate.weekMatch).length}</strong><span>in Coimbra this week</span></div><Link className="text-link" href="/carousel">Build weekly carousel</Link></div>
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
