import assert from "node:assert/strict";
import test from "node:test";
import { blankResume, normalizeResume, TEMPLATE_IDS } from "../../shared/resume/model";
import { resolveStyleOptions } from "../../shared/resume/style-options";
import {
  applyTemplatePreset,
  getSelectedTemplatePreset,
  templatePresets,
} from "../../shared/resume/template-presets";

test("legacy appearance resolves to concrete, stable choices without rewriting saved data", () => {
  for (const template of TEMPLATE_IDS) {
    for (const headerLayout of ["auto", "stacked", "split", "inline"] as const) {
      const resume = blankResume();
      Object.assign(resume.style, { template, headerLayout, dateFormat: "template" });
      const original = structuredClone(resume);
      const resolved = resolveStyleOptions(resume.style);
      assert.ok(Object.values(resolved).every((value) => !new Set(["auto", "template"]).has(value)));
      assert.deepEqual(resolveStyleOptions({ ...resume.style, ...resolved }), resolved);
      assert.equal(resolved.bulletStyle, "disc");
      assert.equal(resolved.dateFormat, template === "classic" ? "numeric" : "original");
      assert.deepEqual(resume, original);
      assert.deepEqual(normalizeResume(resume).style, resume.style);
    }
  }
});

test("materializing displayed choices does not mark a visually unchanged preset as custom", () => {
  for (const preset of templatePresets) {
    const style = applyTemplatePreset(blankResume().style, preset.id);
    const concrete = { ...style, ...resolveStyleOptions(style) };
    assert.equal(getSelectedTemplatePreset(concrete)?.id, preset.id);
    assert.equal(
      getSelectedTemplatePreset(normalizeResume({ ...blankResume(), style: concrete }).style)?.id,
      preset.id,
    );
    assert.equal(getSelectedTemplatePreset({ ...concrete, nameSize: concrete.nameSize + 1 }), undefined);
  }
});
