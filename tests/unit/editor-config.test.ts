import assert from "node:assert/strict";
import test from "node:test";
import {
  birthdayDisplay,
  DATE_FORMAT_OPTIONS,
  formatDate,
  isTextSection,
  safeURL,
  sectionTypes,
  sortEntriesByDate,
} from "../../shared/resume/editor-config";
import {
  blankResume,
  ENTRY_EXTRA_KEYS,
  normalizeResume,
  PRESENTATION_DEFAULTS,
  PROFILE_EXTRA_KEYS,
  SECTION_KINDS,
} from "../../shared/resume/model";

test("divider and marker geometry round trips and clamps untrusted values", () => {
  const resume = blankResume();
  Object.assign(resume.style, {
    dividerWidth: 0.5,
    bulletSize: 5.25,
    bulletStyle: "diamond",
    headerSpacing: 15,
    headingGap: 7,
  });
  assert.deepEqual(normalizeResume(resume).style, resume.style);
  Object.assign(resume.style, {
    dividerWidth: -1,
    bulletSize: 100,
    bulletStyle: "url(evil)",
    headerSpacing: NaN,
    headingGap: 100,
  });
  const style = normalizeResume(resume).style;
  assert.equal(style.dividerWidth, 0);
  assert.equal(style.bulletSize, 8);
  assert.equal(style.bulletStyle, "auto");
  assert.equal(style.headerSpacing, 27);
  assert.equal(style.headingGap, 25);
});
test("entry alignment and independent URL layout validate and round trip", () => {
  const resume = blankResume();
  Object.assign(resume.style, {
    entryTitleAlign: "right",
    entrySubtitleAlign: "center",
    entryMetaAlign: "left",
    entryLinkLayout: "separate",
    entryLinkAlign: "center",
  });
  assert.deepEqual(normalizeResume(resume).style, resume.style);
  Object.assign(resume.style, {
    entryTitleAlign: "bad",
    entrySubtitleAlign: "bad",
    entryMetaAlign: "bad",
    entryLinkLayout: "bad",
    entryLinkAlign: "bad",
  });
  const style = normalizeResume(resume).style;
  for (const key of [
    "entryTitleAlign",
    "entrySubtitleAlign",
    "entryMetaAlign",
    "entryLinkLayout",
    "entryLinkAlign",
  ] as const)
    assert.equal(style[key], PRESENTATION_DEFAULTS[key]);
});

test("removed automatic link settings migrate to inline and right without losing explicit choices", () => {
  const resume = blankResume();
  assert.equal(resume.style.entryLinkLayout, "inline");
  assert.equal(resume.style.entryLinkAlign, "right");
  for (const legacy of [
    { entryLinkLayout: undefined, entryLinkAlign: undefined },
    { entryLinkLayout: "auto", entryLinkAlign: "auto" },
    { entryLinkLayout: "bad", entryLinkAlign: "bad" },
  ]) {
    const restored = normalizeResume({
      ...resume,
      style: { ...resume.style, ...legacy },
    });
    assert.equal(restored.style.entryLinkLayout, "inline");
    assert.equal(restored.style.entryLinkAlign, "right");
  }
  for (const entryLinkLayout of ["inline", "separate"] as const) {
    for (const entryLinkAlign of ["left", "center", "right"] as const) {
      const explicit = {
        ...resume,
        style: { ...resume.style, entryLinkLayout, entryLinkAlign },
      };
      assert.deepEqual(normalizeResume(JSON.parse(JSON.stringify(explicit))).style, explicit.style);
    }
  }
});

test("extended profile, experience and module fields survive editable document round trips", () => {
  const resume = blankResume();
  for (const key of PROFILE_EXTRA_KEYS) resume.profile[key] = `value-${key}`;
  resume.profile.birthdayMode = "age";
  resume.sections = SECTION_KINDS.map((kind) => ({
    ...resume.sections[0],
    kind,
    id: kind,
    entries: [{ ...resume.sections[0].entries[0], id: kind, visible: false }],
  }));
  for (const section of resume.sections)
    for (const key of ENTRY_EXTRA_KEYS) section.entries[0][key] = `value-${key}`;
  const restored = normalizeResume(JSON.parse(JSON.stringify(resume)));
  assert.deepEqual(restored.profile, resume.profile);
  assert.deepEqual(restored.style, resume.style);
  assert.deepEqual(
    restored.sections.map((s) => s.kind),
    [...SECTION_KINDS],
  );
  assert.deepEqual(
    restored.sections.map((s) => s.entries.map(({ id: _, ...e }) => e)),
    resume.sections.map((s) => s.entries.map(({ id: _, ...e }) => e)),
  );
  assert.deepEqual(new Set(sectionTypes.map((type) => type.kind)), new Set(SECTION_KINDS));
  assert.equal(isTextSection("languages"), true);
  assert.equal(isTextSection("research"), false);
});
test("old files gain safe presentation defaults and reject untrusted settings", () => {
  const resume = JSON.parse(JSON.stringify(blankResume()));
  for (const key of Object.keys(PRESENTATION_DEFAULTS)) delete resume.style[key];
  const restored = normalizeResume(resume);
  for (const [key, value] of Object.entries(PRESENTATION_DEFAULTS))
    assert.equal(restored.style[key as keyof typeof PRESENTATION_DEFAULTS], value);
  Object.assign(resume.style, {
    profileColor: "red;background:url(x)",
    nameSize: 1000,
    moduleSpacing: -9,
    dateFormat: "bad",
    paperStyle: "bad",
  });
  const sanitized = normalizeResume(resume).style;
  assert.equal(sanitized.profileColor, "");
  assert.equal(sanitized.nameSize, 40);
  assert.equal(sanitized.moduleSpacing, 5);
  assert.equal(sanitized.dateFormat, "original");
  assert.equal(sanitized.paperStyle, "plain");
});
test("date display changes format without changing source or present-day markers", () => {
  assert.equal(formatDate("2026-01", "chinese"), "2026年1月");
  assert.equal(formatDate("2026年1月", "numeric"), "2026.01");
  assert.equal(formatDate("2026.01", "original"), "2026.01");
  assert.equal(formatDate("2026-13", "numeric"), "2026-13");
  assert.equal(formatDate("", "numeric"), "");
  const today = new Date(2026, 10, 3);
  assert.equal(birthdayDisplay("1998-12", "age", today), "27 岁");
  assert.equal(birthdayDisplay("1998-01", "age", today), "28 岁");
  assert.equal(birthdayDisplay("1998-01", "birthday", today), "1998-01");
  assert.equal(birthdayDisplay("not-a-date", "age", today), "not-a-date");
});
test("resume URLs accept ordinary sites and reject executable protocols", () => {
  assert.equal(safeURL("portfolio.example.com/work"), "https://portfolio.example.com/work");
  assert.equal(safeURL("mailto:hello@example.com"), "mailto:hello@example.com");
  assert.equal(safeURL("javascript:alert(1)"), undefined);
  assert.equal(safeURL("data:text/html,x"), undefined);
  assert.equal(safeURL("file:///private/data"), undefined);
  assert.equal(safeURL(""), undefined);
});
test("date formats preserve day precision and present-day markers", () => {
  assert.equal(formatDate("2024-02-29", "numeric"), "2024.02.29");
  assert.equal(formatDate("2024-02-29", "chinese"), "2024年2月29日");
  assert.equal(formatDate("2026.01", "dash"), "2026-01");
  assert.equal(formatDate("2026-01", "slash"), "2026/01");
  assert.equal(formatDate("2026-01", "year"), "2026年");
  assert.equal(formatDate("2023-02-29", "chinese"), "2023-02-29");
  for (const [format] of DATE_FORMAT_OPTIONS) {
    const resume = blankResume();
    resume.style.dateFormat = format;
    assert.equal(normalizeResume(resume).style.dateFormat, format);
    assert.equal(formatDate("至今", format), "至今");
  }
});
test("chronological sorting handles mixed month formatting and does not mutate entries", () => {
  const entry = blankResume().sections[0].entries[0];
  const entries = ["2023.9", "2024-01", "2023年10月", ""].map((start) => ({ ...entry, start }));
  assert.deepEqual(
    sortEntriesByDate(entries).map((e) => e.start),
    ["2024-01", "2023年10月", "2023.9", ""],
  );
  assert.deepEqual(
    entries.map((e) => e.start),
    ["2023.9", "2024-01", "2023年10月", ""],
  );
});
