import assert from "node:assert/strict";
import test from "node:test";
import { blankResume, LAYOUT_DEFAULTS, normalizeResume, TEMPLATE_IDS } from "../../shared/resume/model";
import { partitionSections, templates } from "../../shared/resume/templates";
import { verticalPageMargin } from "../../src/features/preview/lib/paper";
import { identifyHeading, parseResumeText } from "../../src/features/import/lib/import-text";

test("resume validation rejects incompatible and oversized documents", () => {
  assert.throws(() => normalizeResume(null));
  assert.throws(() => normalizeResume({ version: 2, profile: {}, sections: [] }));
  assert.throws(() => normalizeResume({ ...blankResume(), sections: Array(41).fill({ entries: [] }) }), /40/);
  assert.throws(
    () => normalizeResume({ ...blankResume(), sections: [{ entries: Array(151).fill({}) }] }),
    /150/,
  );
});
test("untrusted settings are clamped and remote avatars are discarded", () => {
  const raw = blankResume();
  raw.style.fontSize = 100;
  raw.style.margin = -20;
  raw.style.lineHeight = NaN;
  raw.style.sectionSize = 100;
  raw.style.entryTitleSize = 1;
  raw.profile.avatar = "https://example.com/tracker.png";
  raw.style.accent = 'red"; background:url(https://example.com)';
  const r = normalizeResume(raw);
  assert.equal(r.style.fontSize, 16);
  assert.equal(r.style.margin, 6);
  assert.equal(r.style.lineHeight, 1.65);
  assert.equal(r.style.sectionSize, 24);
  assert.equal(r.style.entryTitleSize, 9);
  assert.equal(r.profile.avatar, "");
  assert.equal(r.style.accent, "#34584b");
});
test("imported repeated IDs cannot create colliding editor targets", () => {
  const raw = blankResume();
  raw.sections[0].id = "same";
  raw.sections[1].id = "same";
  const r = normalizeResume(raw);
  assert.notEqual(r.sections[0].id, r.sections[1].id);
});
test("plain PDF text parsing retains Chinese content and escapes markup", () => {
  const r = parseResumeText(
    "陈见山\n产品经理\n138 0012 3456 | chen@example.com\n工作经历\n山海科技 2023.07 至今\n• 提升转化率 28%\n教育背景\n浙江大学\n技能\nSQL 与 <script>alert(1)</script>",
    "我的简历.pdf",
  );
  assert.equal(r.profile.name, "陈见山");
  assert.equal(r.profile.role, "产品经理");
  assert.equal(r.profile.email, "chen@example.com");
  assert.equal(r.profile.phone, "138 0012 3456");
  assert.equal(r.sections.length, 3);
  assert.match(r.sections[0].entries[0].description, /提升转化率 28%/);
  assert.match(r.sections[2].entries[0].description, /&lt;script&gt;/);
});
test("generic imported content without recognized sections is preserved", () => {
  const text =
    "Alex Morgan\nProduct Manager\nA detailed career summary that should not disappear when no headings are found.";
  const r = parseResumeText(text);
  assert.match(JSON.stringify(r), /A detailed career summary/);
  assert.throws(() => parseResumeText("   \n "), /OCR/);
  assert.equal(identifyHeading("WORK EXPERIENCE"), "work");
  assert.equal(identifyHeading("教育经历："), "education");
});
test("all template IDs survive resume validation and match the gallery", () => {
  assert.deepEqual(
    templates.map((template) => template.id),
    [...TEMPLATE_IDS],
  );
  for (const template of TEMPLATE_IDS) {
    const raw = blankResume();
    raw.style.template = template;
    assert.equal(normalizeResume(raw).style.template, template);
  }
});
test("sidebar partitions visible sections once and keeps each column's order", () => {
  const resume = blankResume();
  resume.sections = ["skills", "work", "education", "custom", "project", "education"].map((kind, i) => ({
    id: String(i),
    title: String(i),
    kind: kind as (typeof resume.sections)[number]["kind"],
    visible: i !== 5,
    entries: [],
  }));
  const original = structuredClone(resume.sections);
  const columns = partitionSections(resume.sections);
  assert.deepEqual(
    columns.sidebar.map((section) => section.id),
    ["0", "2"],
  );
  assert.deepEqual(
    columns.main.map((section) => section.id),
    ["1", "3", "4"],
  );
  assert.equal(new Set([...columns.sidebar, ...columns.main].map((section) => section.id)).size, 5);
  assert.deepEqual(resume.sections, original);
});
test("layout overrides validate, round trip and default safely for old documents", () => {
  const raw = blankResume();
  Object.assign(raw.style, {
    nameAlign: "right",
    contactAlign: "center",
    sectionAlign: "left",
    bodyAlign: "justify",
    headerLayout: "split",
    headingStyle: "tint",
  });
  assert.deepEqual(normalizeResume(raw).style, raw.style);
  const old = JSON.parse(JSON.stringify(raw));
  for (const key of Object.keys(LAYOUT_DEFAULTS)) delete old.style[key];
  for (const [key, expected] of Object.entries(LAYOUT_DEFAULTS)) {
    assert.equal(normalizeResume(old).style[key as keyof typeof LAYOUT_DEFAULTS], expected);
    old.style[key] = 'invalid"; color:red';
  }
  for (const [key, expected] of Object.entries(LAYOUT_DEFAULTS)) {
    assert.equal(normalizeResume(old).style[key as keyof typeof LAYOUT_DEFAULTS], expected);
  }
});

test("compact margins survive JSON round trips without changing existing page spacing", () => {
  for (const template of TEMPLATE_IDS) {
    for (const margin of [6, 8, 10, 17, 25]) {
      const resume = blankResume();
      resume.style.template = template;
      resume.style.margin = margin;
      assert.equal(normalizeResume(JSON.parse(JSON.stringify(resume))).style.margin, margin);
      const expectedVertical = template === "classic" && margin >= 10 ? Math.max(10, margin - 1) : margin;
      assert.equal(verticalPageMargin(resume.style), expectedVertical);
    }
  }
});
