import type { Entry, Resume, SectionKind } from "./model";

export const sectionTypes: Array<{ kind: SectionKind; title: string; textOnly?: boolean }> = [
  { kind: "work", title: "工作经历" },
  { kind: "education", title: "教育经历" },
  { kind: "project", title: "项目经历" },
  { kind: "organization", title: "社团和组织经历" },
  { kind: "research", title: "研究经历" },
  { kind: "awards", title: "荣誉奖项" },
  { kind: "portfolio", title: "作品集" },
  { kind: "skills", title: "专业技能", textOnly: true },
  { kind: "languages", title: "语言能力", textOnly: true },
  { kind: "certificates", title: "证书 / 执照", textOnly: true },
  { kind: "interests", title: "兴趣爱好", textOnly: true },
  { kind: "summary", title: "个人总结", textOnly: true },
  { kind: "extra", title: "其他信息", textOnly: true },
  { kind: "custom", title: "自定义模块" },
];
export const isTextSection = (kind: SectionKind) =>
  !!sectionTypes.find((type) => type.kind === kind)?.textOnly;
export const profileFieldGroups: Array<{
  title: string;
  fields: Array<{ key: keyof Resume["profile"]; label: string; placeholder?: string; options?: string[] }>;
}> = [
  {
    title: "个人资料 · 选填",
    fields: [
      { key: "gender", label: "性别", options: ["男", "女", "其他"] },
      { key: "ethnic", label: "民族" },
      {
        key: "politicalStatus",
        label: "政治面貌",
        options: ["群众", "共青团员", "中共党员", "中共预备党员", "其他"],
      },
      { key: "birthday", label: "出生年月", placeholder: "1998-06" },
    ],
  },
  {
    title: "求职意向",
    fields: [
      {
        key: "employmentStatus",
        label: "当前状态",
        options: ["在校生", "应届毕业生", "离职，随时到岗", "在职，考虑机会", "在职，暂不考虑"],
      },
      { key: "expectedCity", label: "意向城市" },
      { key: "expectedSalary", label: "期望薪资", placeholder: "15–25K / 面议" },
    ],
  },
  {
    title: "社交信息",
    fields: [
      { key: "wechat", label: "微信" },
      { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/..." },
    ],
  },
  {
    title: "其他信息 · 选填",
    fields: [
      { key: "height", label: "身高", placeholder: "170 cm" },
      { key: "weight", label: "体重", placeholder: "60 kg" },
      { key: "hometown", label: "籍贯" },
      { key: "maritalStatus", label: "婚姻状况", options: ["未婚", "已婚", "其他"] },
      { key: "zodiac", label: "星座" },
      { key: "mbti", label: "MBTI", placeholder: "如 INTJ" },
    ],
  },
];
export const DATE_FORMAT_OPTIONS = [
  ["original", "保持原样"],
  ["numeric", "2026.01"],
  ["dash", "2026-01"],
  ["slash", "2026/01"],
  ["chinese", "2026年1月"],
  ["year", "2026年"],
  ["template", "模板默认"],
] as const;
export function parseDateParts(value: string): { year: string; month?: number; day?: number } | null {
  const normalized = value.trim().replace(/年|月/g, "-").replace(/日$/, "").replace(/-$/, "");
  const match = /^(\d{4})(?:[.\-/](\d{1,2})(?:[.\-/](\d{1,2}))?)?$/.exec(normalized);
  if (!match || +match[1] < 1) return null;
  const month = match[2] ? +match[2] : undefined,
    day = match[3] ? +match[3] : undefined;
  if (month !== undefined && (month < 1 || month > 12)) return null;
  if (day !== undefined && (day < 1 || day > new Date(Date.UTC(+match[1], month!, 0)).getUTCDate()))
    return null;
  return { year: match[1], month, day };
}
export function dateInputValue(value: string): string {
  const parts = parseDateParts(value);
  if (!parts?.month) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}${parts.day ? `-${String(parts.day).padStart(2, "0")}` : ""}`;
}
export function formatDate(value: string, format: Resume["style"]["dateFormat"]): string {
  if (format === "original" || format === "template") return value;
  const parts = parseDateParts(value);
  if (!parts) return value;
  if (format === "year" || !parts.month) return `${parts.year}年`;
  if (format === "chinese") return `${parts.year}年${parts.month}月${parts.day ? `${parts.day}日` : ""}`;
  const separator = format === "dash" ? "-" : format === "slash" ? "/" : ".";
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    ...(parts.day ? [String(parts.day).padStart(2, "0")] : []),
  ].join(separator);
}
export function birthdayDisplay(
  birthday: string,
  mode: Resume["profile"]["birthdayMode"],
  today = new Date(),
): string {
  if (mode !== "age") return birthday;
  const match = /^(\d{4})[.\-/](\d{1,2})(?:[.\-/](\d{1,2}))?$/.exec(birthday);
  if (!match) return birthday;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3] || 1)];
  if (month < 1 || month > 12 || day < 1 || day > 31) return birthday;
  const age =
    today.getFullYear() -
    year -
    (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
  return age >= 0 && age <= 120 ? `${age} 岁` : birthday;
}
export function safeURL(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function sortEntriesByDate(entries: Entry[]): Entry[] {
  const key = (value: string) => {
    const match = /^(\d{4})(?:[.\-/年](\d{1,2}))?/.exec(value.trim());
    return match ? Number(match[1]) * 12 + Number(match[2] || 1) : -1;
  };
  return [...entries].sort((a, b) => key(b.start) - key(a.start));
}
