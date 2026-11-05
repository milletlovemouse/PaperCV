import type { Resume, Template } from "@resume/model";
import { getTemplate } from "@resume/templates";
import { layoutAttributes, resumeStyles } from "../lib/presentation";
import PaperContent from "./PaperContent";

/** Uses the actual template components; no pagination or export side effects. */
export function TemplateThumbnail({ resume, template }: { resume: Resume; template: Template }) {
  const preview: Resume = {
    ...resume,
    style: { ...resume.style, ...getTemplate(template).defaults, template },
  };
  return (
    <div className="template-thumbnail-frame" aria-hidden="true">
      <div
        className={`resume-preview template-${template} thumbnail-resume`}
        style={resumeStyles(preview)}
        {...layoutAttributes(preview)}
      >
        <div className="paper-page">
          <PaperContent resume={preview} />
        </div>
      </div>
    </div>
  );
}
