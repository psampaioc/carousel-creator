"use client";

import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";

type Slide = { _id: string; kind: "cover" | "event" | "online"; title: string; body: string; template: "coimbra-grid" | "poster-frame"; accent: string; shape: "arc" | "square" | "circle"; imageCandidateId?: string; factualReviewRequired: boolean; finalReviewComplete: boolean };

export function SlideEditor({ slide }: { slide: Slide }) {
  const update = useMutation(api.drafts.updateSlide);
  const [title, setTitle] = useState(slide.title);
  const [body, setBody] = useState(slide.body);
  const [template, setTemplate] = useState(slide.template);
  const [accent, setAccent] = useState(slide.accent);
  const [shape, setShape] = useState(slide.shape);
  const [message, setMessage] = useState<string>();
  return <form className="slide-editor" onSubmit={async (event) => { event.preventDefault(); await update({ slideId: slide._id as never, title, body, template, accent, shape, imageCandidateId: slide.imageCandidateId as never, finalReviewComplete: !slide.factualReviewRequired }); setMessage("Saved. Review factual edits before export."); }}><label>Headline<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Display copy<textarea value={body} onChange={(event) => setBody(event.target.value)} /></label><div className="editor-controls"><label>Template<select value={template} onChange={(event) => setTemplate(event.target.value as typeof template)}><option value="coimbra-grid">Coimbra grid</option><option value="poster-frame">Poster frame</option></select></label><label>Shape<select value={shape} onChange={(event) => setShape(event.target.value as typeof shape)}><option value="arc">Arc</option><option value="square">Square</option><option value="circle">Circle</option></select></label><label>Colour<input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></label></div><button className="button">Save slide</button>{message ? <p className="save-note">{message}</p> : null}</form>;
}
