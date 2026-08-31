"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import Link from "next/link";

import { api } from "@/convex/_generated/api";
import { authenticatedQueryArgs } from "@/lib/convex/authenticatedQuery";

const monday = () => {
  const date = new Date();
  const offset = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export function WeeklyDraftBuilder() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const candidates = useQuery(
    api.drafts.listEligible,
    authenticatedQueryArgs(isAuthLoading, isAuthenticated),
  );
  const create = useMutation(api.drafts.create);
  const [weekStart, setWeekStart] = useState(monday);
  const [inPerson, setInPerson] = useState<string[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string>();
  const [error, setError] = useState<string>();
  const groups = useMemo(() => ({ inPerson: candidates?.filter((candidate) => candidate.format !== "online") ?? [], online: candidates?.filter((candidate) => candidate.format === "online") ?? [] }), [candidates]);

  const inPersonLimit = online.length ? 8 : 9;
  const toggle = (id: string, current: string[], setCurrent: (value: string[]) => void, limit: number) => {
    if (current.includes(id)) return setCurrent(current.filter((item) => item !== id));
    if (current.length < limit) setCurrent([...current, id]);
  };

  if (isAuthLoading) return <main className="carousel-shell"><p className="loading-note">Connecting your account…</p></main>;

  if (!isAuthenticated) return <main className="carousel-shell"><p className="loading-note">Sign in to build a carousel.</p></main>;

  if (candidates === undefined) return <main className="carousel-shell"><p className="loading-note">Loading approved events…</p></main>;

  return (
    <main className="carousel-shell">
      <header className="carousel-header"><div><p className="eyebrow">Weekly edition</p><h1>Build next week’s field guide.</h1><p>Only reviewed and approved events appear here. Choose fewer when the week is sparse.</p></div><Link className="text-link" href="/workspace">Back to review</Link></header>
      <section className="builder-grid">
        <section className="builder-card"><label className="field-label">Week beginning<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} /></label><div className="selection-count"><strong>{inPerson.length}</strong> of {inPersonLimit} in-person slides · <strong>{online.length}</strong> of 5 online events</div>{error ? <p className="editor-error">{error}</p> : null}<button className="button" disabled={!inPerson.length} onClick={async () => { try { setError(undefined); const id = await create({ weekStart, candidateIds: inPerson as never[], onlineCandidateIds: online as never[] }); setDraftId(id); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the draft"); } }}>Create carousel draft</button>{draftId ? <Link className="button secondary-button" href={`/carousel/${draftId}`}>Open the draft</Link> : null}</section>
        <section className="builder-card"><p className="section-kicker">In person · choose up to {inPersonLimit}</p><div className="candidate-picker">{groups.inPerson.map((candidate) => <label key={candidate._id} className="picker-row"><input type="checkbox" checked={inPerson.includes(candidate._id)} onChange={() => toggle(candidate._id, inPerson, setInPerson, inPersonLimit)} /><span><strong>{candidate.title}</strong><small>{candidate.city ?? "Location in source record"}</small></span></label>) || <p>No approved in-person events yet.</p>}</div></section>
        <section className="builder-card"><p className="section-kicker">Online · final slide only · choose up to 5</p><div className="candidate-picker">{groups.online.map((candidate) => <label key={candidate._id} className="picker-row"><input type="checkbox" checked={online.includes(candidate._id)} onChange={() => { if (!online.includes(candidate._id) && inPerson.length > 8) setInPerson(inPerson.slice(0, 8)); toggle(candidate._id, online, setOnline, 5); }} /><span><strong>{candidate.title}</strong><small>Online event</small></span></label>) || <p>No approved online events yet.</p>}</div></section>
      </section>
    </main>
  );
}
