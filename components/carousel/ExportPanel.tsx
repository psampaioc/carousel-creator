"use client";

import { useAction, useMutation } from "convex/react";
import { toPng } from "html-to-image";
import { useState } from "react";

import { api } from "@/convex/_generated/api";

export function ExportPanel({ draftId, blocked }: { draftId: string; blocked: boolean }) {
  const uploadSlide = useAction(api.exports.uploadSlide);
  const startExport = useMutation(api.exportAttempts.start);
  const failExport = useMutation(api.exportAttempts.fail);
  const markExported = useMutation(api.drafts.markExported);
  const [status, setStatus] = useState<"idle" | "rendering" | "uploading" | "complete" | "error">("idle");
  const [message, setMessage] = useState<string>();

  const runExport = async () => {
    setStatus("rendering");
    setMessage("Rendering reviewed slides at 1080 × 1350…");
    let attemptId: string | undefined;
    try {
      const attempt = await startExport({ draftId: draftId as never });
      if (attempt.status === "active") throw new Error("This draft is already exporting in another tab. Wait for it to finish, then retry if needed.");
      attemptId = attempt.attemptId;
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-export-slide]"));
      if (!nodes.length || nodes.length > 10) throw new Error("Expected between one and ten export slides");
      const rendered: string[] = [];
      for (const node of nodes) {
        node.classList.add("is-exporting");
        const dataUrl = await toPng(node, { width: 1080, height: 1350, canvasWidth: 1080, canvasHeight: 1350, pixelRatio: 1, cacheBust: true }).finally(() => node.classList.remove("is-exporting"));
        const pngBase64 = dataUrl.split(",")[1];
        if (!pngBase64) throw new Error("A slide did not render as PNG data");
        rendered.push(pngBase64);
      }
      setStatus("uploading");
      for (const [position, pngBase64] of rendered.entries()) {
        setMessage(`Uploading slide ${position + 1} of ${rendered.length}…`);
        await uploadSlide({ draftId: draftId as never, attemptId: attemptId as never, position, pngBase64 });
      }
      await markExported({ draftId: draftId as never, attemptId: attemptId as never });
      setStatus("complete");
      setMessage(`${rendered.length} numbered PNG files are in the weekly Drive folder. Publishing remains manual.`);
    } catch (reason) {
      if (attemptId) await failExport({ attemptId: attemptId as never }).catch(() => undefined);
      setStatus("error");
      setMessage(reason instanceof Error ? reason.message : "Export failed. The draft is still editable.");
    }
  };

  return <section className="export-panel"><p className="section-kicker">Friday export</p><h2>Source check, then Drive.</h2><ul><li>Dates and places match the linked sources.</li><li>Every image has the correct attribution and provenance.</li><li>Factual edits have their final review marker.</li><li>Publishing to Instagram remains a manual step.</li></ul><button className="button" disabled={blocked || status === "rendering" || status === "uploading"} onClick={runExport}>{status === "rendering" ? "Rendering…" : status === "uploading" ? "Uploading…" : "Export reviewed carousel"}</button>{blocked ? <p className="export-blocked">Complete every factual review and select media for each event first.</p> : null}{message ? <p className={`export-message export-${status}`}>{message}</p> : null}</section>;
}
