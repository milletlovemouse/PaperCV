import type { Resume } from "@resume/model";
import { ResumeContent, SidebarContent } from "./ResumeContent";

export interface PageFragments {
  main: string;
  sidebar?: string;
}

export default function PaperContent({ resume, fragments }: { resume: Resume; fragments?: PageFragments }) {
  if (resume.style.template === "sidebar") {
    return (
      <div className="paper-layout sidebar-layout">
        {fragments ? (
          <>
            <aside
              className="resume-document sidebar-document"
              dangerouslySetInnerHTML={{ __html: fragments.sidebar || "" }}
            />
            <div
              className="resume-document main-document"
              dangerouslySetInnerHTML={{ __html: fragments.main }}
            />
          </>
        ) : (
          <>
            <aside className="resume-document sidebar-document">
              <SidebarContent resume={resume} column="sidebar" />
            </aside>
            <div className="resume-document main-document">
              <SidebarContent resume={resume} column="main" />
            </div>
          </>
        )}
      </div>
    );
  }
  return fragments ? (
    <div className="resume-document main-document" dangerouslySetInnerHTML={{ __html: fragments.main }} />
  ) : (
    <div className="resume-document main-document">
      <ResumeContent resume={resume} />
    </div>
  );
}
