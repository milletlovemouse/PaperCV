import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Resume } from "@resume/model";
import { paginate } from "../lib/paginate";
import { layoutEntryHeadings } from "../lib/layout-entry-headings";

import { paperSize, verticalPageMargin } from "../lib/paper";
import { layoutAttributes, resumeStyles } from "../lib/presentation";
import PaperContent, { type PageFragments } from "./PaperContent";
import { ResumeContent, SidebarContent } from "./ResumeContent";
export default function ResumePreview({
  resume,
  zoom = 1,
  onSelect,
  onPages,
  print = false,
}: {
  resume: Resume;
  zoom?: number;
  onSelect?: (sectionId: string, entryId?: string) => void;
  onPages?: (count: number) => void;
  print?: boolean;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const sidebarMeasureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PageFragments[]>([]);
  const [error, setError] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const loading = () => setFontsReady(false);
    const loaded = () => {
      if (alive) setFontsReady(true);
    };
    document.fonts.addEventListener("loading", loading);
    document.fonts.addEventListener("loadingdone", loaded);
    document.fonts.ready.then(loaded);
    return () => {
      alive = false;
      document.fonts.removeEventListener("loading", loading);
      document.fonts.removeEventListener("loadingdone", loaded);
    };
  }, []);
  const size = paperSize(resume.style.paper);
  const isSidebar = resume.style.template === "sidebar";
  useLayoutEffect(() => {
    document.documentElement.dataset.pdfReady = "false";
    if (!fontsReady || !measureRef.current) return;
    try {
      const height = ((size.height - verticalPageMargin(resume.style) * 2) * 96) / 25.4;
      layoutEntryHeadings(measureRef.current);
      if (isSidebar && sidebarMeasureRef.current) layoutEntryHeadings(sidebarMeasureRef.current);
      const mainPages = paginate(measureRef.current, height);
      const sidebarPages =
        isSidebar && sidebarMeasureRef.current ? paginate(sidebarMeasureRef.current, height) : [];
      const result = Array.from({ length: Math.max(mainPages.length, sidebarPages.length) }, (_, index) => ({
        main: mainPages[index] || "",
        sidebar: sidebarPages[index] || "",
      }));
      setPages(result);
      setError("");
      onPages?.(result.length);
      const frame = requestAnimationFrame(() => {
        document.documentElement.dataset.pdfReady = "true";
      });
      return () => cancelAnimationFrame(frame);
    } catch (error) {
      setError(error instanceof Error ? error.message : "分页失败");
    }
  }, [resume, fontsReady, size.height, onPages, isSidebar]);
  return (
    <div
      className={`resume-preview template-${resume.style.template} ${print ? "print-mode" : ""}`}
      style={resumeStyles(resume)}
      {...layoutAttributes(resume)}
    >
      <div className="measure-shell" aria-hidden="true">
        <div className="measure-main">
          <div ref={measureRef} className="resume-document main-document" data-measure-column="main">
            {isSidebar ? <SidebarContent resume={resume} column="main" /> : <ResumeContent resume={resume} />}
          </div>
        </div>
        {isSidebar && (
          <div className="measure-sidebar">
            <div
              ref={sidebarMeasureRef}
              className="resume-document sidebar-document"
              data-measure-column="sidebar"
            >
              <SidebarContent resume={resume} column="sidebar" />
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="pagination-error" role="alert">
          {error}
        </div>
      )}
      <div className="paper-stack" style={{ zoom } as CSSProperties}>
        {pages.map((fragments, index) => (
          <div className="paper-wrap" key={index}>
            {!print && (
              <div className="paper-caption">
                <span>
                  {resume.style.paper.toUpperCase()} · {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>
                <span>简历预览</span>
              </div>
            )}
            <article
              className="paper-page"
              aria-label={`简历第 ${index + 1} 页`}
              onClick={(event) => {
                if (!print && (event.target as HTMLElement).closest("a")) event.preventDefault();
                const target = (event.target as HTMLElement).closest<HTMLElement>("[data-section]");
                if (target?.dataset.section) onSelect?.(target.dataset.section, target.dataset.entry);
              }}
            >
              <PaperContent resume={resume} fragments={fragments} />
              {resume.style.showPageNumbers && (
                <div className="paper-page-number">
                  {index + 1} / {pages.length}
                </div>
              )}
            </article>
          </div>
        ))}
      </div>
      <style>{`@page { size: ${size.width}mm ${size.height}mm; margin: 0 !important; }`}</style>
    </div>
  );
}
