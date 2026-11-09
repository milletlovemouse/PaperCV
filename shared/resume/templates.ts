import type { Resume, Section, Template } from "./model";

export type TemplateCategory = "single" | "columns" | "compact";
export const STANDARD_STYLE = {
  template: "classic",
  font: "yahei",
  fontSize: 12,
  lineHeight: 20 / 12,
  margin: 13,
  paper: "a4",
  headerLayout: "auto",
  nameAlign: "left",
  contactAlign: "left",
  sectionAlign: "left",
  bodyAlign: "left",
  headingStyle: "auto",
  infoStyle: "simple",
  headerDecoration: "plain",
  paperStyle: "plain",
  skillStyle: "text",
  nameSize: 20,
  sectionSize: 14,
  entryTitleSize: 12,
  moduleSpacing: 10,
  entrySpacing: 0,
  entryLayout: "two",
  entryPriority: "time",
  entrySeparator: "none",
  profileColor: "#000000",
  titleColor: "#000000",
  accent: "#000000",
  entryTitleAlign: "left",
  entrySubtitleAlign: "left",
  entryMetaAlign: "right",
  entryLinkLayout: "inline",
  entryLinkAlign: "right",
  decorationColor: "#000000",
  showPageNumbers: false,
  dateFormat: "template",
  dividerWidth: 1,
  bulletSize: 3.5,
  bulletStyle: "disc",
  headerSpacing: 27,
  headingGap: 10,
} as const satisfies Partial<Resume["style"]>;
// The older Qt PDF has different physical metrics from the live web preview.
export const ORIGINAL_PDF_STYLE = {
  ...STANDARD_STYLE,
  fontSize: 11.2,
  sectionSize: 13.2,
  entryTitleSize: 11.2,
  lineHeight: 18.8 / 11.2,
  margin: (35 * 25.4) / 72,
  bulletStyle: "diamond",
  bulletSize: 3.2,
  headerSpacing: 15,
  headingGap: 7,
  dividerWidth: 4 / 3,
} as const satisfies Partial<Resume["style"]>;
export interface ResumeTemplate {
  id: Template;
  name: string;
  description: string;
  category: TemplateCategory;
  label: string;
  detail: string;
  defaults: Pick<Resume["style"], "font" | "fontSize" | "lineHeight" | "margin">;
}
export const templates: ResumeTemplate[] = [
  {
    id: "classic",
    name: "经典专业",
    description: "左对齐名片 · 标准双行经历",
    category: "single",
    label: "经典",
    detail: "无衬线字体、黑色横线分区，公司与职位分行，日期和地点靠右。",
    defaults: { font: "yahei", fontSize: 12, lineHeight: 20 / 12, margin: 13 },
  },
  {
    id: "modern",
    name: "简约现代",
    description: "分栏页眉 · 色块标题",
    category: "single",
    label: "商务",
    detail: "姓名与联系信息分列，模块使用色块标题，突出职业经历。",
    defaults: { font: "sans", fontSize: 12, lineHeight: 1.6, margin: 17 },
  },
  {
    id: "editorial",
    name: "人文书写",
    description: "衬线标题 · 编号章节",
    category: "single",
    label: "质感",
    detail: "衬线大标题、章节编号与克制的细线，留出更舒展的阅读节奏。",
    defaults: { font: "serif", fontSize: 12, lineHeight: 1.75, margin: 19 },
  },
  {
    id: "sidebar",
    name: "双栏简约",
    description: "信息侧栏 · 主次分明",
    category: "columns",
    label: "双栏",
    detail: "基本信息、教育、技能置于左栏；工作、项目和自定义经历置于右栏。两栏独立分页。",
    defaults: { font: "sans", fontSize: 11.5, lineHeight: 1.65, margin: 15 },
  },
  {
    id: "timeline",
    name: "时间轴履历",
    description: "日期左列 · 纵向轨迹",
    category: "single",
    label: "经历",
    detail: "日期单独排列在左侧，右侧以时间轴串联经历与成果，突出职业成长。",
    defaults: { font: "sans", fontSize: 11.5, lineHeight: 1.65, margin: 16 },
  },
  {
    id: "compact",
    name: "高效紧凑",
    description: "横排名片 · 高信息密度",
    category: "compact",
    label: "紧凑",
    detail: "姓名与求职意向横排，压缩模块留白，适合经历丰富的一页简历。",
    defaults: { font: "sans", fontSize: 11.5, lineHeight: 1.45, margin: 14 },
  },
];

export function getTemplate(id: Template): ResumeTemplate {
  return templates.find((template) => template.id === id) || templates[0];
}
export function partitionSections(sections: Section[]): { sidebar: Section[]; main: Section[] } {
  const visible = sections.filter((section) => section.visible);
  return {
    sidebar: visible.filter((section) => section.kind === "education" || section.kind === "skills"),
    main: visible.filter((section) => section.kind !== "education" && section.kind !== "skills"),
  };
}
