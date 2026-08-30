"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { use } from "react";

import { CoverSlide } from "@/components/carousel/CoverSlide";
import { EventSlide } from "@/components/carousel/EventSlide";
import { OnlineEventsSlide } from "@/components/carousel/OnlineEventsSlide";
import { SlideEditor } from "@/components/carousel/SlideEditor";
import { api } from "@/convex/_generated/api";

export default function CarouselDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const draftId = use(params).draftId;
  const result = useQuery(api.drafts.get, { draftId: draftId as never });
  if (result === undefined) return <main className="carousel-shell"><p className="loading-note">Loading carousel draft…</p></main>;
  if (!result) return <main className="carousel-shell"><p>Draft not found.</p><Link href="/carousel">Back to drafts</Link></main>;
  return <main className="carousel-shell"><header className="carousel-header"><div><p className="eyebrow">Carousel editor · {result.draft.weekStart}</p><h1>Make it yours. Keep it true.</h1></div><Link className="text-link" href="/carousel">New draft</Link></header><div className="editor-layout"><section className="slide-stack">{result.slides.map((slide) => { const selectedImage = slide.images.find((image: { _id: string }) => image._id === slide.imageCandidateId); return <div className="slide-card" key={slide._id}>{slide.kind === "cover" ? <CoverSlide {...slide} /> : slide.kind === "online" ? <OnlineEventsSlide {...slide} events={result.onlineEvents} /> : <EventSlide {...slide} image={selectedImage} number={slide.position} />}<SlideEditor slide={slide as never} /></div>; })}</section><aside className="editor-aside"><p className="section-kicker">Editorial boundary</p><h2>{result.draft.needsFinalReview ? "Factual review required" : "Draft facts reviewed"}</h2><p>Images retain their source and provenance. Generated images are always labelled. Cover stays first and online events stay last while event slides can be reordered.</p></aside></div></main>;
}
