import { useEffect, useRef, useState } from "react";
import type { Resume } from "@resume/model";
import { paperSize } from "../lib/paper";

export function usePreviewLayout(paper: Resume["style"]["paper"]) {
  const [zoom, setZoom] = useState(0.82);
  const [previewOnly, setPreviewOnly] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = previewRef.current;
    if (!panel) return;
    if (previewOnly) panel.parentElement?.scrollTo({ left: 0 });
    const fit = () =>
      setZoom(
        Math.min(0.9, Math.max(0.35, (panel.clientWidth - 95) / ((paperSize(paper).width * 96) / 25.4))),
      );
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [previewOnly, paper]);
  useEffect(() => {
    if (!previewOnly) return;
    const restore = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[role="dialog"], [role="alertdialog"]'))
        setPreviewOnly(false);
    };
    window.addEventListener("keydown", restore);
    return () => window.removeEventListener("keydown", restore);
  }, [previewOnly]);
  return { zoom, setZoom, previewOnly, setPreviewOnly, previewRef };
}
