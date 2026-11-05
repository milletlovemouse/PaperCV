import type { Resume } from "@resume/model";

export const paperSize = (paper: Resume["style"]["paper"]) =>
  paper === "letter" ? { width: 215.9, height: 279.4 } : { width: 210, height: 297 };
export const verticalPageMargin = (style: Resume["style"]) =>
  // Preserve existing classic spacing while allowing deliberately compact page margins.
  style.template === "classic" && style.margin >= 10 ? Math.max(10, style.margin - 1) : style.margin;
