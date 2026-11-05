import { useEffect, useState } from "react";
import { normalizeResume, type Resume } from "@resume/model";
import { getPrintTitle } from "../lib/print-title";
import ResumePreview from "./ResumePreview";

export default function PrintPage() {
  const [resume, setResume] = useState<Resume | null>(() =>
    window.__PRINT_RESUME__ ? normalizeResume(window.__PRINT_RESUME__) : null,
  );
  const [error, setError] = useState("");
  const token = new URLSearchParams(location.search).get("print");
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    const receive = (event: MessageEvent) => {
      if (
        window.parent === window ||
        event.origin !== location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "papercv:resume" ||
        event.data?.token !== token
      )
        return;
      try {
        setResume(normalizeResume(event.data.resume));
      } catch {
        setError("简历数据无法读取");
        window.parent.postMessage({ type: "papercv:error", token }, location.origin);
      }
    };
    window.addEventListener("message", receive);
    if (window.parent !== window)
      window.parent.postMessage({ type: "papercv:ready", token }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, [token]);

  useEffect(() => {
    if (!resume) return;
    // Chrome and Edge use the print document title as the suggested PDF filename.
    document.title = getPrintTitle(resume.title);
    let cancelled = false;
    let timer = 0;
    const report = (type: string) => {
      if (window.parent !== window) window.parent.postMessage({ type, token }, location.origin);
    };
    // Pagination becomes ready after fonts are loaded. Images must also be decoded before printing.
    const check = async () => {
      if (cancelled) return;
      if (document.querySelector(".pagination-error")) {
        report("papercv:error");
        return;
      }
      if (document.documentElement.dataset.pdfReady !== "true") {
        timer = window.setTimeout(() => void check(), 50);
        return;
      }
      if (document.querySelectorAll(".paper-page").length > 60) {
        setError("简历超过 60 页，请精简内容后打印");
        report("papercv:error");
        return;
      }
      try {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, (image) => image.decode()));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        if (!cancelled) {
          document.documentElement.dataset.printReady = "true";
          report("papercv:rendered");
        }
      } catch {
        if (!cancelled) {
          setError("图片加载失败，请检查证件照后重试");
          report("papercv:error");
        }
      }
    };
    document.documentElement.dataset.printReady = "false";
    void check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resume, token]);

  if (error) return <p role="alert">{error}</p>;
  if (!resume) return <p role="status">等待简历打印数据…</p>;
  return <ResumePreview resume={resume} print />;
}
