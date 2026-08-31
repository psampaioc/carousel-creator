"use client";

import { useMutation } from "convex/react";
import { useState } from "react";

import { api } from "@/convex/_generated/api";

type ImageCandidate = { _id: string; driveFileId: string; sourceUrl: string; provenance: "official" | "announcement" | "generated" };
type Slide = { _id: string; kind: "cover" | "event" | "online"; title: string; body: string; template: "coimbra-grid" | "poster-frame"; accent: string; shape: "arc" | "square" | "circle"; imageCandidateId?: string; images: ImageCandidate[]; factualReviewRequired: boolean; finalReviewComplete: boolean };

export function SlideEditor({ slide }: { slide: Slide }) {
  const update = useMutation(api.drafts.updateSlide);
  const move = useMutation(api.drafts.moveSlide);
  const completeReview = useMutation(api.drafts.completeSlideReview);
  const [title, setTitle] = useState(slide.title);
  const [body, setBody] = useState(slide.body);
  const [template, setTemplate] = useState(slide.template);
  const [accent, setAccent] = useState(slide.accent);
  const [shape, setShape] = useState(slide.shape);
  const [imageCandidateId, setImageCandidateId] = useState(slide.imageCandidateId);
  const [message, setMessage] = useState<string>();

  return <form className="slide-editor" onSubmit={async (event) => {
    event.preventDefault();
    await update({ slideId: slide._id as never, title, body, template, accent, shape, imageCandidateId: imageCandidateId as never, finalReviewComplete: slide.finalReviewComplete });
    setMessage(title !== slide.title || body !== slide.body ? "Saved. Factual copy now needs review." : "Saved.");
  }}>
    <label>Headline<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Display copy<textarea value={body} onChange={(event) => setBody(event.target.value)} /></label>
    {slide.kind === "event" && slide.images.length ? <fieldset className="image-picker"><legend>Drive images · provenance order</legend>{slide.images.map((image) => <label key={image._id} className={imageCandidateId === image._id ? "is-selected" : ""}><input type="radio" name={`image-${slide._id}`} checked={imageCandidateId === image._id} onChange={() => setImageCandidateId(image._id)} /><span className="image-thumb" role="img" aria-label={`${image.provenance} image preview`} style={{ backgroundImage: `url(/api/drive-image/${encodeURIComponent(image.driveFileId)})` }} /><span><strong>{image.provenance === "generated" ? "AI-generated" : image.provenance}</strong><small>{image.sourceUrl}</small></span></label>)}</fieldset> : null}
    <div className="editor-controls"><label>Template<select value={template} onChange={(event) => setTemplate(event.target.value as typeof template)}><option value="coimbra-grid">Coimbra grid</option><option value="poster-frame">Poster frame</option></select></label><label>Shape<select value={shape} onChange={(event) => setShape(event.target.value as typeof shape)}><option value="arc">Arc</option><option value="square">Square</option><option value="circle">Circle</option></select></label><label>Colour<input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></label></div>
    {slide.kind === "event" ? <div className="slide-order-controls"><button type="button" className="text-button" onClick={() => move({ slideId: slide._id as never, direction: "up" })}>Move up</button><button type="button" className="text-button" onClick={() => move({ slideId: slide._id as never, direction: "down" })}>Move down</button></div> : null}
    <button className="button">Save slide</button>
    {slide.factualReviewRequired && !slide.finalReviewComplete ? <button type="button" className="review-button" onClick={async () => { await completeReview({ slideId: slide._id as never }); setMessage("Factual review complete."); }}>Mark factual review complete</button> : null}
    {message ? <p className="save-note">{message}</p> : null}
  </form>;
}
