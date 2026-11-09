import assert from "node:assert/strict";
import test from "node:test";
import { blankResume, normalizeResume, TEMPLATE_IDS } from "../../shared/resume/model";
import {
  applyTemplatePreset,
  getSelectedTemplatePreset,
  templatePresets,
} from "../../shared/resume/template-presets";
import { ORIGINAL_PDF_STYLE, STANDARD_STYLE } from "../../shared/resume/templates";

test("preset text hierarchy remains readable and standard actions reset all four levels", () => {
  for (const { id, defaults: style } of templatePresets) {
    assert.ok(style.nameSize >= style.sectionSize * 1.4, `${id}: name hierarchy`);
    assert.ok(style.sectionSize > style.entryTitleSize, `${id}: module hierarchy`);
    assert.ok(style.entryTitleSize >= style.fontSize, `${id}: title hierarchy`);
    assert.ok(style.sectionSize - style.fontSize <= 2, `${id}: restrained module size`);
  }
  for (const style of [STANDARD_STYLE, ORIGINAL_PDF_STYLE]) {
    const resume = blankResume();
    Object.assign(resume.style, { nameSize: 40, sectionSize: 24, entryTitleSize: 24 }, style);
    assert.equal(resume.style.nameSize, 20);
    assert.equal(resume.style.entryTitleSize, style.fontSize);
    assert.equal(resume.style.sectionSize, style.fontSize + 2);
  }
});

test("curated presets have unique identities and distinct, valid, restorable appearances", () => {
  assert.equal(templatePresets.length, 36);
  assert.equal(new Set(templatePresets.map((preset) => preset.id)).size, templatePresets.length);
  assert.equal(
    new Set(templatePresets.map((preset) => JSON.stringify(preset.defaults))).size,
    templatePresets.length,
  );
  for (const preset of templatePresets) {
    assert.ok(TEMPLATE_IDS.includes(preset.template));
    const resume = blankResume();
    resume.style = applyTemplatePreset(resume.style, preset.id);
    const restored = normalizeResume(JSON.parse(JSON.stringify(resume)));
    assert.deepEqual(restored.style, resume.style, preset.id);
    assert.equal(getSelectedTemplatePreset(restored.style)?.id, preset.id);
  }
});

test("switching any preset resets its full appearance while retaining paper and page-number preferences", () => {
  const original = { ...blankResume().style, paper: "letter" as const, showPageNumbers: false };
  for (const from of templatePresets) {
    const previous = applyTemplatePreset(original, from.id);
    for (const to of templatePresets) {
      const next = applyTemplatePreset(previous, to.id);
      assert.deepEqual(next, applyTemplatePreset(original, to.id), `${from.id} -> ${to.id}`);
      assert.equal(next.paper, "letter");
      assert.equal(next.showPageNumbers, false);
    }
  }
});

test("custom appearance is distinguished from a preset, with safe handling of unknown preset IDs", () => {
  const style = applyTemplatePreset(blankResume().style, "business-blue");
  assert.equal(
    getSelectedTemplatePreset({ ...style, paper: "letter", showPageNumbers: false })?.id,
    "business-blue",
  );
  assert.equal(getSelectedTemplatePreset({ ...style, accent: "#123456" }), undefined);
  assert.equal(getSelectedTemplatePreset({ ...style, entrySpacing: style.entrySpacing + 1 }), undefined);
  assert.equal(applyTemplatePreset(style, "unknown"), style);
});

test("the library exercises every appearance control and the available visual variants", () => {
  const appearances = templatePresets.map((preset) => preset.defaults);
  const keys = Object.keys(blankResume().style).filter((key) => key !== "paper" && key !== "showPageNumbers");
  for (const key of keys) {
    const values = appearances.map((style) => style[key as keyof typeof style]);
    assert.ok(
      values.every((value) => value !== undefined),
      `${key} is missing from a preset`,
    );
    assert.ok(new Set(values).size > 1, `${key} never varies across the library`);
  }
  const variants = {
    font: ["sans", "serif", "yahei"],
    headerLayout: ["auto", "stacked", "split", "inline"],
    nameAlign: ["auto", "left", "center", "right"],
    contactAlign: ["auto", "left", "center", "right"],
    sectionAlign: ["auto", "left", "center", "right"],
    bodyAlign: ["auto", "left", "center", "right", "justify"],
    headingStyle: [
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
    infoStyle: ["auto", "simple", "labels", "icons", "dots", "outline", "tags"],
    headerDecoration: ["auto", "plain", "rule", "banner", "card", "side", "circle"],
    paperStyle: ["plain", "frame", "rail", "soft", "corner"],
    skillStyle: ["text", "icons", "tags"],
    dateFormat: ["original", "numeric", "dash", "slash", "chinese", "year", "template"],
    entryLayout: ["two", "one"],
    entryPriority: ["time", "location"],
    entrySeparator: ["dot", "bar", "none"],
    entryTitleAlign: ["left", "center", "right"],
    entrySubtitleAlign: ["left", "center", "right"],
    entryMetaAlign: ["left", "right"],
    entryLinkLayout: ["inline", "separate"],
    entryLinkAlign: ["left", "right"],
    photoShape: ["rect", "round", "circle"],
    bulletStyle: ["auto", "disc", "circle", "square", "diamond"],
  };
  for (const [key, expected] of Object.entries(variants)) {
    assert.deepEqual(
      new Set(appearances.map((style) => style[key as keyof typeof style])),
      new Set(expected),
      key,
    );
  }
});
