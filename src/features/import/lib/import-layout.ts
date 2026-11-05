import { blankEntry, uid, type Entry, type Resume, type Section } from "@resume/model";
import { escapeHTML, identifyHeading, parseResumeText } from "./import-text";

/** Coordinates are PDF points, with a top-left origin, after applying the page viewport. */
export interface PDFTextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
}
export interface PDFTextPage {
  width: number;
  height: number;
  items: PDFTextRun[];
}
export interface PDFLine {
  text: string;
  x: number;
  y: number;
  end: number;
  size: number;
  page: number;
  pageWidth: number;
  pageHeight: number;
  parts: Array<{ text: string; x: number; end: number }>;
}
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 12;
};
const pageNumber = /^(?:第\s*\d+\s*页(?:\s*[/／共]\s*\d+\s*页?)?|\d+\s*[/／]\s*\d+)$/;

/** Keep distant runs separate so right-aligned dates and locations retain their meaning. */
export function extractPDFLines(pages: PDFTextPage[]): PDFLine[] {
  const lines: PDFLine[] = [];
  pages.forEach((page, pageIndex) => {
    const bodySize = median(page.items.filter((item) => item.text.trim()).map((item) => item.size));
    const rows: Array<{ y: number; items: PDFTextRun[] }> = [];
    for (const item of [...page.items].sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (!item.text.trim()) continue;
      // Qt exports can contain a one-point tracking ID outside the printable area.
      // Require both tiny type and an edge position; never discard ordinary small body text.
      if (item.size < bodySize * 0.4 && (item.y < bodySize * 2 || item.y > page.height - bodySize)) continue;
      let row = rows.find((row) => Math.abs(row.y - item.y) <= Math.min(2, item.size * 0.23));
      if (!row) rows.push((row = { y: item.y, items: [] }));
      row.items.push(item);
    }
    for (const row of rows.sort((a, b) => a.y - b.y)) {
      const items = row.items.sort((a, b) => a.x - b.x);
      const parts: PDFLine["parts"] = [];
      for (const item of items) {
        const previous = parts.at(-1);
        const gap = previous ? item.x - previous.end : 0;
        if (previous && gap < item.size * 2.5) {
          previous.text += `${gap > item.size * 0.2 ? " " : ""}${item.text}`;
          previous.end = Math.max(previous.end, item.x + item.width);
        } else parts.push({ text: item.text, x: item.x, end: item.x + item.width });
      }
      const text = parts.map((part) => part.text.trim()).join("  ");
      if (pageNumber.test(text) && (row.y < 30 || row.y > page.height - 35)) continue;
      lines.push({
        text,
        x: items[0].x,
        y: row.y,
        end: Math.max(...parts.map((part) => part.end)),
        size: median(items.map((item) => item.size)),
        parts,
        page: pageIndex,
        pageWidth: page.width,
        pageHeight: page.height,
      });
    }
  });
  return lines;
}

const dateToken = String.raw`(?:19|20)\d{2}(?:[./年-]\s*\d{1,2}(?:月)?)?`;
const dateRange = new RegExp(
  `(${dateToken})\\s*(?:[-—–~～至]|到)\\s*(${dateToken}|至今|现在|Present|Current)`,
  "i",
);
const normalizeDate = (value: string) =>
  value
    .replace(/[./年]/g, "-")
    .replace(/月/g, "")
    .replace(/\s/g, "")
    .replace(/-(\d)$/, "-0$1");
const isURL = /^(?:https?:\/\/|www\.|(?:github|gitee|linkedin)\.com\/)/i;
const emailPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;
const phonePattern = /(?:\+?86[-\s]?)?1[3-9](?:[ -]?\d){9}/;
const splitInfo = (value: string) =>
  value
    .split(/\s*[|丨｜•]\s*/)
    .map((value) => value.trim())
    .filter(Boolean);

function readProfile(resume: Resume, lines: PDFLine[]) {
  // Parse only header text; dates in experience entries must not become contact fields.
  const profile = { ...resume.profile, name: "", role: "", summary: "" };
  profile.email =
    lines
      .map((line) => line.text)
      .join("\n")
      .match(emailPattern)?.[0] || "";
  profile.phone =
    lines
      .map((line) => line.text)
      .join("\n")
      .match(phonePattern)?.[0] || "";
  const rest: string[] = [];
  const nameLine = lines.find(
    (line) =>
      line.text.length <= 30 &&
      !emailPattern.test(line.text) &&
      !phonePattern.test(line.text) &&
      !isURL.test(line.text) &&
      !/\d{4}/.test(line.text),
  );
  if (nameLine) profile.name = nameLine.text;
  for (const line of lines) {
    if (line === nameLine) continue;
    const contact = emailPattern.test(line.text) || phonePattern.test(line.text);
    for (const value of splitInfo(line.text)) {
      if (emailPattern.test(value) || phonePattern.test(value)) {
        // Keep a contact line's unrecognized labels or extra text instead of silently losing it.
        const leftover = value
          .replace(emailPattern, "")
          .replace(phonePattern, "")
          .replace(/^(?:电话|手机|邮箱|Email|Tel)\s*[:：]?\s*/i, "")
          .trim();
        if (leftover) rest.push(leftover);
      } else if (isURL.test(value)) {
        if (!profile.website) profile.website = value;
        else rest.push(value);
      } else if (/^(?:19|20)\d{2}[-./年]\d{1,2}月?(?:[-./]\d{1,2}日?)?$/.test(value)) {
        profile.birthday = normalizeDate(value);
      } else if (/^[男女]$/.test(value)) profile.gender = value;
      else if (/^[\u4e00-\u9fff]{1,8}族$/.test(value)) profile.ethnic = value;
      else if (/^(?:中共党员|中共预备党员|共青团员|群众|民主党派)$/.test(value))
        profile.politicalStatus = value;
      else if (contact && value.length <= 12) profile.location = value;
      else rest.push(value);
    }
  }
  // Role commonly follows contact details, rather than immediately following the name.
  const roleIndex = rest.findIndex(
    (value) =>
      value.length <= 50 && /工程师|开发|经理|设计师|求职|Engineer|Developer|Designer|Manager/i.test(value),
  );
  if (roleIndex >= 0) profile.role = rest.splice(roleIndex, 1)[0];
  else if (rest[0] && rest[0].length <= 40) profile.role = rest.shift()!;
  profile.summary = rest.join("\n");
  resume.profile = profile;
}

interface Paragraph {
  text: string;
  level: number;
  line: PDFLine;
}
function descriptionHTML(lines: PDFLine[], left: number): string {
  const paragraphs: Paragraph[] = [];
  for (const line of lines) {
    const explicitBullet = /^[-•●▪◦·]\s*/.test(line.text);
    const indent = line.x - left;
    const level = explicitBullet
      ? Math.max(1, Math.round(indent / (line.size * 1.75)))
      : indent >= line.size
        ? Math.max(1, Math.min(6, Math.round(indent / (line.size * 1.75))))
        : 0;
    const text = line.text.replace(/^[-•●▪◦·]\s*/, "");
    const previous = paragraphs.at(-1);
    const sameIndent = previous && Math.abs(previous.line.x - line.x) < line.size * 0.4;
    const samePageWrap =
      previous && previous.line.page === line.page && line.y - previous.line.y < line.size * 1.95;
    const nextPageWrap =
      previous &&
      previous.line.page + 1 === line.page &&
      previous.line.y > previous.line.pageHeight - 65 &&
      line.y < 80 &&
      previous.line.end > previous.line.pageWidth - left - line.size * 3;
    if (previous && sameIndent && !explicitBullet && (samePageWrap || nextPageWrap)) {
      const space = /[A-Za-z0-9]$/.test(previous.text) && /^[A-Za-z0-9]/.test(text) ? " " : "";
      previous.text += space + text;
      previous.line = line;
    } else paragraphs.push({ text, level, line });
  }
  // Build nested lists, keeping child bullets inside their parent li.
  let html = "",
    depth = 0;
  for (const paragraph of paragraphs) {
    const level = Math.min(paragraph.level, depth + 1);
    if (!level) {
      while (depth) {
        html += "</li></ul>";
        depth--;
      }
      html += `<p>${escapeHTML(paragraph.text)}</p>`;
    } else {
      while (depth > level) {
        html += "</li></ul>";
        depth--;
      }
      if (depth === level) html += "</li><li>";
      else {
        html += "<ul><li>";
        depth++;
      }
      html += escapeHTML(paragraph.text);
    }
  }
  while (depth) {
    html += "</li></ul>";
    depth--;
  }
  return html;
}

function entryStart(line: PDFLine, left: number): RegExpMatchArray | null {
  if (Math.abs(line.x - left) > line.size * 0.7) return null;
  const match = line.text.match(dateRange);
  if (!match || !line.text.slice(0, match.index).trim()) return null;
  // Only a date range at the end of a heading; dates mentioned in prose are not new jobs.
  return line.text.slice((match.index || 0) + match[0].length).trim() ? null : match;
}

function readEntries(section: Section, lines: PDFLine[], left: number) {
  const structured = ["work", "education", "project", "organization", "research"].includes(section.kind);
  let entry: Entry | null = null;
  let body: PDFLine[] = [];
  let expectingSubtitle = false;
  const flush = () => {
    if (entry) {
      entry.description = descriptionHTML(body, left);
      section.entries.push(entry);
    }
    body = [];
  };
  for (const line of lines) {
    const date = structured ? entryStart(line, left) : null;
    if (date) {
      flush();
      entry = {
        ...blankEntry(),
        title: line.text.slice(0, date.index).trim(),
        start: normalizeDate(date[1]),
        end: normalizeDate(date[2]),
      };
      expectingSubtitle = true;
    } else if (
      entry &&
      expectingSubtitle &&
      Math.abs(line.x - left) < line.size * 0.7 &&
      !/^[-•●▪◦·]/.test(line.text) &&
      !identifyHeading(line.text)
    ) {
      const [first, ...other] = line.parts;
      if (other.length && (other.at(-1)!.x > line.pageWidth * 0.8 || isURL.test(other.at(-1)!.text))) {
        const last = other.pop()!.text;
        if (isURL.test(last)) entry.url = last;
        else entry.location = last;
      }
      let subtitle = [first.text, ...other.map((part) => part.text)].join(" ");
      if (section.kind === "education") {
        const degree = subtitle.match(
          /(?:博士|硕士|本科|学士|大专|专科|高中|中专|PhD|Master|Bachelor)(?:学位)?/i,
        );
        if (degree) {
          entry.degree = degree[0];
          const after = subtitle.slice((degree.index || 0) + degree[0].length).trim();
          if (after) entry.college = after;
          subtitle = subtitle.slice(0, degree.index).trim();
        }
      }
      if (section.kind === "work") {
        const department = subtitle.match(/\s+(\S*(?:部门|中心|部))$/);
        if (department) {
          entry.department = department[1];
          subtitle = subtitle.slice(0, department.index).trim();
        }
      }
      entry.subtitle = subtitle;
      expectingSubtitle = false;
    } else {
      if (!entry) entry = blankEntry();
      body.push(line);
      expectingSubtitle = false;
    }
  }
  flush();
}

export function parseResumeLayout(
  pages: PDFTextPage[],
  title = "导入的简历",
): { resume: Resume; text: string } {
  const lines = extractPDFLines(pages);
  const text = lines.map((line) => line.text).join("\n");
  const resume = parseResumeText(text, title);
  const headingIndex = lines.findIndex((line) => identifyHeading(line.text));
  if (headingIndex < 0) return { resume, text };
  readProfile(resume, lines.slice(0, headingIndex));
  resume.sections = [];
  const left = median(lines.filter((line) => identifyHeading(line.text)).map((line) => line.x));
  let section: Section | null = null;
  let body: PDFLine[] = [];
  const flush = () => {
    if (section) {
      readEntries(section, body, left);
      resume.sections.push(section);
    }
    body = [];
  };
  for (const line of lines.slice(headingIndex)) {
    const kind = identifyHeading(line.text);
    if (kind) {
      // A repeated heading at the top of a continuation page belongs to the same module.
      const previous = section as Section | null;
      if (previous?.kind === kind && previous.title === line.text && line.y < 80) continue;
      flush();
      section = { id: uid(), title: line.text.replace(/[:：]$/, ""), kind, visible: true, entries: [] };
    } else body.push(line);
  }
  flush();
  const bodySize = median(lines.filter((line) => !identifyHeading(line.text)).map((line) => line.size));
  const name = lines.slice(0, headingIndex).find((line) => line.text === resume.profile.name);
  // Recover the basic single-column typography in CSS pixels (1 pt = 4/3 px).
  Object.assign(resume.style, {
    template: "classic",
    fontSize: Math.max(10, Math.min(16, Math.round(((bodySize * 4) / 3) * 10) / 10)),
    margin: Math.max(10, Math.min(25, Math.round((left * 25.4) / 72))),
    nameSize: Math.max(20, Math.min(40, Math.round(((name?.size || 18) * 4) / 3))),
    nameAlign: "left",
    contactAlign: "left",
    sectionAlign: "left",
    headingStyle: "line",
    headerLayout: "stacked",
    accent: "#222222",
    profileColor: "#222222",
    titleColor: "#222222",
    decorationColor: "#222222",
    infoStyle: "simple",
    showPageNumbers: false,
  });
  return { resume, text };
}
