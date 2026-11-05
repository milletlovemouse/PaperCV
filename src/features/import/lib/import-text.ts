import { blankEntry, blankResume, uid, type Resume, type SectionKind } from "@resume/model";

export function escapeHTML(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}
const headings: Array<[RegExp, SectionKind]> = [
  [/^(教育(?:经历|背景)?|学历|EDUCATION)$/i, "education"],
  [
    /^(工作(?:经历|经验)?|工作[与和及/]实习(?:经历|经验)?|职业经历|实习(?:经历|经验)|(?:PROFESSIONAL |WORK )?EXPERIENCE)$/i,
    "work",
  ],
  [/^(项目(?:经历|经验)?|PROJECTS?(?: EXPERIENCE)?)$/i, "project"],
  [/^(专业技能|技能(?:特长)?|技能与证书|个人技能|SKILLS?(?: & CERTIFICATIONS)?)$/i, "skills"],
  [/^(自我评价|个人简介|个人总结|职业概述|SUMMARY|PROFILE|ABOUT ME)$/i, "summary"],
  [/^(荣誉奖项|获奖经历|AWARDS|HONORS)$/i, "awards"],
  [/^(语言能力|语言技能|LANGUAGES?)$/i, "languages"],
  [/^(证书(?:\/执照)?|资格证书|CERTIFICATIONS?|CERTIFICATES?)$/i, "certificates"],
  [/^(社团和组织经历|组织经历|校园经历|社会实践|ACTIVITIES|VOLUNTEER(?: EXPERIENCE)?)$/i, "organization"],
  [/^(研究经历|科研经历|RESEARCH(?: EXPERIENCE)?)$/i, "research"],
  [/^(作品集|个人作品|PORTFOLIO)$/i, "portfolio"],
  [/^(兴趣爱好|HOBBIES|INTERESTS)$/i, "interests"],
  [/^(其他(?:信息)?|ADDITIONAL(?: INFORMATION)?)$/i, "extra"],
];
export function identifyHeading(line: string): SectionKind | null {
  const normalized = line.replace(/[\s:：]/g, "");
  return (
    headings.find(
      ([pattern]) => pattern.test(normalized) || pattern.test(line.trim().replace(/[:：]$/, "")),
    )?.[1] ?? null
  );
}

/** Conservative parser: retain text, avoid inventing employment entities. */
export function parseResumeText(input: string, title = "导入的简历"): Resume {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error("未提取到文字。扫描版 PDF 需要先经过 OCR 识别。");
  if (input.length > 100000) throw new Error("PDF 文字超过 10 万字，请先保留简历相关页面。");
  const resume = blankResume();
  resume.title = title.replace(/\.pdf$/i, "");
  resume.sections = [];
  const email = input.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || "";
  const phone = input.match(/(?:\+?86[-\s]?)?1[3-9](?:[ -]?\d){9}/)?.[0] || "";
  resume.profile.email = email;
  resume.profile.phone = phone;
  let current: { title: string; kind: SectionKind; lines: string[] } | null = null;
  const groups: Array<{ title: string; kind: SectionKind; lines: string[] }> = [];
  const preamble: string[] = [];
  for (const line of lines) {
    if (/^(第\s*\d+\s*页(?:\s*[/／共]\s*\d+\s*页?)?|\d+\s*[/／]\s*\d+)$/.test(line)) continue;
    const kind = identifyHeading(line);
    if (kind) {
      current = { title: line.replace(/[:：]$/, ""), kind, lines: [] };
      groups.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (
    preamble.length &&
    preamble[0].length <= 30 &&
    !preamble[0].includes("@") &&
    !/\d{5}/.test(preamble[0])
  ) {
    resume.profile.name = preamble.shift()!;
    if (preamble[0] && preamble[0].length <= 40 && !preamble[0].includes("@") && !/\d{5}/.test(preamble[0])) {
      resume.profile.role = preamble.shift()!;
    }
  }
  resume.profile.summary = preamble
    .map((line) =>
      line
        .replace(email || /\b\B/, "")
        .replace(phone || /\b\B/, "")
        .replace(/^[\s|·•]+|[\s|·•]+$/g, ""),
    )
    .filter(Boolean)
    .join("\n");
  if (!groups.length && !resume.profile.summary && !resume.profile.name) {
    groups.push({ title: "导入内容", kind: "custom", lines });
  }
  for (const group of groups) {
    if (!group.lines.length) continue;
    const entry = blankEntry();
    entry.description = group.lines
      .map((line) => {
        const bullet = /^[-•●▪·]\s*/.test(line);
        const content = escapeHTML(line.replace(/^[-•●▪·]\s*/, ""));
        return bullet ? `<ul><li>${content}</li></ul>` : `<p>${content}</p>`;
      })
      .join("");
    resume.sections.push({
      id: uid(),
      title: group.title,
      kind: group.kind,
      visible: true,
      entries: [entry],
    });
  }
  if (!resume.sections.length && resume.profile.summary) {
    resume.sections.push({
      id: uid(),
      title: "导入内容",
      kind: "custom",
      visible: true,
      entries: [
        {
          ...blankEntry(),
          description: resume.profile.summary
            .split("\n")
            .map((line) => `<p>${escapeHTML(line)}</p>`)
            .join(""),
        },
      ],
    });
    resume.profile.summary = "";
  }
  return resume;
}
