export const MIN_PAGE_MARGIN = 6;
export const MAX_SECTIONS = 40;
export const MAX_ENTRIES = 150;
export const TEMPLATE_IDS = ["classic", "modern", "editorial", "sidebar", "timeline", "compact"] as const;
export type Template = (typeof TEMPLATE_IDS)[number];
export type ResumeUpdater = (change: (resume: Resume) => Resume, separate?: boolean) => void;
export type Alignment = "auto" | "left" | "center" | "right";
export const LAYOUT_DEFAULTS = {
  headerLayout: "auto",
  nameAlign: "auto",
  contactAlign: "auto",
  sectionAlign: "auto",
  bodyAlign: "auto",
  headingStyle: "auto",
} as const;
export const SECTION_KINDS = [
  "education",
  "work",
  "project",
  "skills",
  "organization",
  "research",
  "awards",
  "portfolio",
  "languages",
  "certificates",
  "interests",
  "summary",
  "extra",
  "custom",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];
export const PROFILE_EXTRA_KEYS = [
  "gender",
  "ethnic",
  "politicalStatus",
  "birthday",
  "employmentStatus",
  "expectedCity",
  "expectedSalary",
  "wechat",
  "linkedin",
  "height",
  "weight",
  "hometown",
  "maritalStatus",
  "zodiac",
  "mbti",
] as const;
export const ENTRY_EXTRA_KEYS = [
  "department",
  "degree",
  "college",
  "educationType",
  "schoolTags",
  "url",
] as const;
export const PRESENTATION_DEFAULTS = {
  infoStyle: "auto",
  headerDecoration: "auto",
  paperStyle: "plain",
  skillStyle: "text",
  dateFormat: "original",
  entryLayout: "two",
  entryPriority: "time",
  entrySeparator: "dot",
  entryTitleAlign: "left",
  entrySubtitleAlign: "left",
  entryMetaAlign: "right",
  entryLinkLayout: "auto",
  entryLinkAlign: "auto",
  moduleSpacing: 12,
  entrySpacing: 7,
  nameSize: 20,
  photoShape: "rect",
  dividerWidth: 1,
  bulletSize: 3.5,
  bulletStyle: "auto",
  headerSpacing: 27,
  headingGap: 10,
  profileColor: "",
  titleColor: "",
  decorationColor: "",
  showPageNumbers: true,
} as const;
export interface Entry {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  start: string;
  end: string;
  description: string;
  department?: string;
  degree?: string;
  college?: string;
  educationType?: string;
  schoolTags?: string;
  url?: string;
  visible?: boolean;
}
export interface Section {
  id: string;
  title: string;
  kind: SectionKind;
  visible: boolean;
  entries: Entry[];
}
export interface Resume {
  version: 1;
  title: string;
  profile: {
    name: string;
    role: string;
    phone: string;
    email: string;
    location: string;
    website: string;
    summary: string;
    avatar: string;
    gender?: string;
    ethnic?: string;
    politicalStatus?: string;
    birthday?: string;
    birthdayMode?: "birthday" | "age";
    employmentStatus?: string;
    expectedCity?: string;
    expectedSalary?: string;
    wechat?: string;
    linkedin?: string;
    height?: string;
    weight?: string;
    hometown?: string;
    maritalStatus?: string;
    zodiac?: string;
    mbti?: string;
  };
  style: {
    template: Template;
    accent: string;
    font: "sans" | "serif" | "yahei";
    fontSize: number;
    lineHeight: number;
    margin: number;
    paper: "a4" | "letter";
    headerLayout: "auto" | "stacked" | "split" | "inline";
    nameAlign: Alignment;
    contactAlign: Alignment;
    sectionAlign: Alignment;
    bodyAlign: Alignment | "justify";
    headingStyle:
      | "auto"
      | "line"
      | "tint"
      | "plain"
      | "solid"
      | "double"
      | "dotted"
      | "bracket"
      | "pill"
      | "flag"
      | "side"
      | "table";
    infoStyle: "auto" | "simple" | "labels" | "icons" | "dots" | "outline" | "tags";
    headerDecoration: "auto" | "plain" | "rule" | "banner" | "card" | "side" | "circle";
    paperStyle: "plain" | "frame" | "rail" | "soft" | "corner";
    skillStyle: "text" | "icons" | "tags";
    dateFormat: "original" | "numeric" | "dash" | "slash" | "chinese" | "year" | "template";
    entryLayout: "two" | "one";
    entryPriority: "time" | "location";
    entrySeparator: "dot" | "bar" | "none";
    entryTitleAlign: "left" | "center" | "right";
    entrySubtitleAlign: "left" | "center" | "right";
    entryMetaAlign: "left" | "right";
    entryLinkLayout: "auto" | "inline" | "separate";
    entryLinkAlign: "auto" | "left" | "right";
    moduleSpacing: number;
    entrySpacing: number;
    nameSize: number;
    dividerWidth: number;
    bulletSize: number;
    bulletStyle: "auto" | "disc" | "circle" | "square" | "diamond";
    headerSpacing: number;
    headingGap: number;
    photoShape: "rect" | "round" | "circle";
    profileColor: string;
    titleColor: string;
    decorationColor: string;
    showPageNumbers: boolean;
  };
  sections: Section[];
}
export const STORAGE_KEY = "papercv.resume.v1";
export const ATTACHMENT_NAME = "papercv-resume.json";
export const uid = () => crypto.randomUUID();
export function blankEntry(): Entry {
  return { id: uid(), title: "", subtitle: "", location: "", start: "", end: "", description: "" };
}
export const DEFAULT_RESUME_STYLE = {
  template: "classic",
  accent: "#34584b",
  font: "sans",
  fontSize: 12,
  lineHeight: 1.65,
  margin: 17,
  paper: "a4",
  ...LAYOUT_DEFAULTS,
  ...PRESENTATION_DEFAULTS,
} as const satisfies Resume["style"];

export function blankResume(): Resume {
  return {
    version: 1,
    title: "我的新简历",
    profile: { name: "", role: "", phone: "", email: "", location: "", website: "", summary: "", avatar: "" },
    style: { ...DEFAULT_RESUME_STYLE },
    sections: [
      { id: uid(), title: "教育经历", kind: "education", visible: true, entries: [blankEntry()] },
      { id: uid(), title: "工作经历", kind: "work", visible: true, entries: [blankEntry()] },
      { id: uid(), title: "项目经历", kind: "project", visible: true, entries: [blankEntry()] },
      { id: uid(), title: "专业技能", kind: "skills", visible: true, entries: [blankEntry()] },
    ],
  };
}

const text = (value: unknown, max = 50000) => (typeof value === "string" ? value.slice(0, max) : "");
const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const choice = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;
const alignments: Alignment[] = ["auto", "left", "center", "right"];
const optionalTexts = <T extends string>(
  source: Record<string, unknown>,
  keys: readonly T[],
): Partial<Record<T, string>> =>
  Object.fromEntries(
    keys.filter((key) => typeof source[key] === "string").map((key) => [key, text(source[key], 500)]),
  ) as Partial<Record<T, string>>;
const optionalColor = (value: unknown) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "";

/** Validate untrusted JSON from PDF attachments, disk and HTTP before use. */
export function normalizeResume(value: unknown): Resume {
  if (!value || typeof value !== "object") throw new Error("简历数据格式不正确");
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || !v.profile || typeof v.profile !== "object" || !Array.isArray(v.sections))
    throw new Error("不支持的简历数据格式，请选择纸简导出的 PDF 或 JSON");
  if (v.sections.length > MAX_SECTIONS) throw new Error(`模块数量超过 ${MAX_SECTIONS} 个，请精简后导入`);
  const p = v.profile as Record<string, unknown>;
  const s = (v.style || {}) as Record<string, unknown>;
  let entryCount = 0;
  const result: Resume = {
    version: 1,
    title: text(v.title, 100) || "导入的简历",
    profile: {
      ...optionalTexts(p, PROFILE_EXTRA_KEYS),
      ...(p.birthdayMode === "age" || p.birthdayMode === "birthday" ? { birthdayMode: p.birthdayMode } : {}),
      name: text(p.name, 100),
      role: text(p.role, 200),
      phone: text(p.phone, 100),
      email: text(p.email, 200),
      location: text(p.location, 200),
      website: text(p.website, 500),
      summary: text(p.summary, 10000),
      avatar:
        typeof p.avatar === "string" &&
        /^data:image\/(?:png|jpeg|webp);base64,/.test(p.avatar) &&
        p.avatar.length < 3_000_000
          ? p.avatar
          : "",
    },
    style: {
      template: TEMPLATE_IDS.includes(s.template as Template) ? (s.template as Template) : "classic",
      accent: /^#[0-9a-f]{6}$/i.test(String(s.accent)) ? String(s.accent) : "#34584b",
      font: choice(s.font, ["sans", "serif", "yahei"], "sans"),
      fontSize: clamp(s.fontSize, 10, 16, 12),
      lineHeight: clamp(s.lineHeight, 1.25, 2.1, 1.65),
      margin: clamp(s.margin, MIN_PAGE_MARGIN, 25, 17),
      paper: s.paper === "letter" ? "letter" : "a4",
      headerLayout: choice(s.headerLayout, ["auto", "stacked", "split", "inline"], "auto"),
      nameAlign: choice(s.nameAlign, alignments, "auto"),
      contactAlign: choice(s.contactAlign, alignments, "auto"),
      sectionAlign: choice(s.sectionAlign, alignments, "auto"),
      bodyAlign: choice(s.bodyAlign, [...alignments, "justify"], "auto"),
      headingStyle: choice(
        s.headingStyle,
        [
          "auto",
          "line",
          "tint",
          "plain",
          "solid",
          "double",
          "dotted",
          "bracket",
          "pill",
          "flag",
          "side",
          "table",
        ],
        "auto",
      ),
      infoStyle: choice(
        s.infoStyle,
        ["auto", "simple", "labels", "icons", "dots", "outline", "tags"],
        "auto",
      ),
      headerDecoration: choice(
        s.headerDecoration,
        ["auto", "plain", "rule", "banner", "card", "side", "circle"],
        "auto",
      ),
      paperStyle: choice(s.paperStyle, ["plain", "frame", "rail", "soft", "corner"], "plain"),
      skillStyle: choice(s.skillStyle, ["text", "icons", "tags"], "text"),
      dateFormat: choice(
        s.dateFormat,
        ["original", "numeric", "dash", "slash", "chinese", "year", "template"],
        "original",
      ),
      entryLayout: choice(s.entryLayout, ["two", "one"], "two"),
      entryPriority: choice(s.entryPriority, ["time", "location"], "time"),
      entrySeparator: choice(s.entrySeparator, ["dot", "bar", "none"], "dot"),
      entryTitleAlign: choice(s.entryTitleAlign, ["left", "center", "right"], "left"),
      entrySubtitleAlign: choice(s.entrySubtitleAlign, ["left", "center", "right"], "left"),
      entryMetaAlign: choice(s.entryMetaAlign, ["left", "right"], "right"),
      entryLinkLayout: choice(s.entryLinkLayout, ["auto", "inline", "separate"], "auto"),
      entryLinkAlign: choice(s.entryLinkAlign, ["auto", "left", "right"], "auto"),
      moduleSpacing: clamp(s.moduleSpacing, 5, 30, 12),
      entrySpacing: clamp(s.entrySpacing, 0, 22, 7),
      nameSize: clamp(s.nameSize, 20, 40, PRESENTATION_DEFAULTS.nameSize),
      dividerWidth: clamp(s.dividerWidth, 0, 4, PRESENTATION_DEFAULTS.dividerWidth),
      bulletSize: clamp(s.bulletSize, 2, 8, PRESENTATION_DEFAULTS.bulletSize),
      bulletStyle: choice(s.bulletStyle, ["auto", "disc", "circle", "square", "diamond"], "auto"),
      headerSpacing: clamp(s.headerSpacing, 0, 50, PRESENTATION_DEFAULTS.headerSpacing),
      headingGap: clamp(s.headingGap, 0, 25, PRESENTATION_DEFAULTS.headingGap),
      photoShape: choice(s.photoShape, ["rect", "round", "circle"], "rect"),
      profileColor: optionalColor(s.profileColor),
      titleColor: optionalColor(s.titleColor),
      decorationColor: optionalColor(s.decorationColor),
      showPageNumbers: s.showPageNumbers !== false,
    },
    sections: v.sections.map((raw): Section => {
      if (!raw || typeof raw !== "object") throw new Error("模块数据不完整");
      const section = raw as Record<string, unknown>;
      const entries = Array.isArray(section.entries) ? section.entries : [];
      entryCount += entries.length;
      if (entryCount > MAX_ENTRIES) throw new Error(`经历数量超过 ${MAX_ENTRIES} 条，请精简后导入`);
      return {
        id: uid(),
        title: text(section.title, 100) || "自定义模块",
        kind: SECTION_KINDS.includes(section.kind as SectionKind) ? (section.kind as SectionKind) : "custom",
        visible: section.visible !== false,
        entries: entries.map((rawEntry): Entry => {
          const e = (rawEntry && typeof rawEntry === "object" ? rawEntry : {}) as Record<string, unknown>;
          return {
            ...optionalTexts(e, ENTRY_EXTRA_KEYS),
            ...(typeof e.visible === "boolean" ? { visible: e.visible } : {}),
            id: uid(),
            title: text(e.title, 300),
            subtitle: text(e.subtitle, 500),
            location: text(e.location, 200),
            start: text(e.start, 100),
            end: text(e.end, 100),
            description: text(e.description),
          };
        }),
      };
    }),
  };
  return result;
}
