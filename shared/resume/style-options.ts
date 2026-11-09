import type { Resume } from "./model";

/** Resolve legacy values once for controls, thumbnails, preview and print.
 * Saved data stays compatible; selecting a displayed choice preserves its appearance. */
export function resolveStyleOptions(style: Resume["style"]) {
  const centeredHeader = style.headerLayout === "stacked" || style.headerLayout === "inline";
  return {
    headerLayout: style.headerLayout === "auto" ? "stacked" : style.headerLayout,
    nameAlign: style.nameAlign === "auto" ? (centeredHeader ? "center" : "left") : style.nameAlign,
    contactAlign:
      style.contactAlign === "auto"
        ? centeredHeader
          ? "center"
          : style.headerLayout === "split"
            ? "right"
            : "left"
        : style.contactAlign,
    sectionAlign: style.sectionAlign === "auto" ? "left" : style.sectionAlign,
    bodyAlign: style.bodyAlign === "auto" ? "left" : style.bodyAlign,
    headingStyle:
      style.headingStyle === "auto" ? (style.template === "modern" ? "tint" : "line") : style.headingStyle,
    infoStyle:
      style.infoStyle === "auto"
        ? style.template === "sidebar" && style.headerLayout !== "auto"
          ? "labels"
          : "simple"
        : style.infoStyle,
    headerDecoration:
      style.headerDecoration === "auto"
        ? style.headerLayout !== "auto" && (style.template === "modern" || style.template === "compact")
          ? "rule"
          : "plain"
        : style.headerDecoration,
    bulletStyle: !style.bulletStyle || style.bulletStyle === "auto" ? "disc" : style.bulletStyle,
    dateFormat:
      style.dateFormat === "template"
        ? style.template === "classic"
          ? "numeric"
          : "original"
        : style.dateFormat,
  } as const;
}
