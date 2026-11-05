import { Award, BriefcaseBusiness, FileText, GraduationCap, ImagePlus, Sparkles } from "lucide-react";
import { sectionTypes } from "@resume/editor-config";
import { type SectionKind } from "@resume/model";

export const sectionIcons: Record<SectionKind, typeof FileText> = {
  work: BriefcaseBusiness,
  education: GraduationCap,
  project: FileText,
  skills: Award,
  custom: FileText,
  organization: BriefcaseBusiness,
  research: GraduationCap,
  awards: Award,
  portfolio: ImagePlus,
  languages: FileText,
  certificates: Award,
  interests: Sparkles,
  summary: FileText,
  extra: FileText,
};
export const kinds: Array<[SectionKind, string]> = sectionTypes.map(({ kind, title }) => [kind, title]);
