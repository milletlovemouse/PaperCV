import type { Resume } from "@resume/model";
import { applyTemplatePreset, type TemplatePreset } from "@resume/template-presets";
import { layoutAttributes, resumeStyles } from "../lib/presentation";
import PaperContent from "./PaperContent";

/** Uses the actual template components; no pagination or export side effects. */
export function TemplateThumbnail({ resume, preset }: { resume: Resume; preset: TemplatePreset }) {
  const preview: Resume = {
    ...resume,
    style: applyTemplatePreset(resume.style, preset.id),
  };
  return (
    <div className="template-thumbnail-frame" aria-hidden="true">
      <div
        className={`resume-preview template-${preset.template} thumbnail-resume`}
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
