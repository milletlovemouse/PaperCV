import type { CSSProperties } from "react";
import type { Resume } from "@resume/model";
import { paperSize, verticalPageMargin } from "./paper";

export function resumeStyles(resume: Resume): CSSProperties {
  const size = paperSize(resume.style.paper);
  return {
    "--accent": resume.style.accent,
    "--resume-font-size": `${resume.style.fontSize}px`,
    "--resume-line-height": resume.style.lineHeight,
    "--paper-width": `${size.width}mm`,
    "--paper-height": `${size.height}mm`,
    "--page-margin": `${resume.style.margin}mm`,
    "--page-margin-y": `${verticalPageMargin(resume.style)}mm`,
    "--sidebar-width": "50mm",
    "--column-gap": "9mm",
    "--module-space": `${resume.style.moduleSpacing}px`,
    "--entry-space": `${resume.style.entrySpacing}px`,
    "--divider-width": `${resume.style.dividerWidth ?? 1}px`,
    "--bullet-size": `${resume.style.bulletSize ?? 3.5}px`,
    "--header-spacing": `${resume.style.headerSpacing ?? 27}px`,
    "--heading-gap": `${resume.style.headingGap ?? 10}px`,
    "--name-size": `${resume.style.nameSize}px`,
    "--section-size": `${resume.style.sectionSize}px`,
    "--entry-title-size": `${resume.style.entryTitleSize}px`,
    "--profile-color": resume.style.profileColor || "#000000",
    "--title-color": resume.style.titleColor || "#000000",
    "--decoration-color": resume.style.decorationColor || resume.style.accent,
    "--resume-font":
      resume.style.font === "yahei"
        ? '"Microsoft YaHei", "Noto Sans SC Variable", "PingFang SC", sans-serif'
        : resume.style.font === "serif"
          ? '"Noto Serif SC Variable", "Songti SC", "SimSun", serif'
          : '"Noto Sans SC Variable", "PingFang SC", "Microsoft YaHei", sans-serif',
  } as CSSProperties;
}
export function layoutAttributes(resume: Resume) {
  return {
    "data-entry-title-align": resume.style.entryTitleAlign || "left",
    "data-entry-subtitle-align": resume.style.entrySubtitleAlign || "left",
    "data-entry-meta-align": resume.style.entryMetaAlign || "right",
    "data-bullet-style": resume.style.bulletStyle || "auto",
    "data-header-layout": resume.style.headerLayout,
    "data-name-align": resume.style.nameAlign,
    "data-contact-align": resume.style.contactAlign,
    "data-section-align": resume.style.sectionAlign,
    "data-body-align": resume.style.bodyAlign,
    "data-heading-style": resume.style.headingStyle,
    "data-info-style": resume.style.infoStyle,
    "data-header-decoration": resume.style.headerDecoration,
    "data-paper-style": resume.style.paperStyle,
    "data-skill-style": resume.style.skillStyle,
    "data-photo-shape": resume.style.photoShape,
    "data-entry-layout": resume.style.entryLayout,
  };
}
