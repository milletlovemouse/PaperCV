// Static print renderer integration: no API service required.
// Browser UI checks are performed separately through the connected browser.
import { chromium } from "playwright-core";
import { renderPDF } from "../helpers/print";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { DATE_FORMAT_OPTIONS, formatDate } from "../../shared/resume/editor-config";
import { blankEntry, type Resume } from "../../shared/resume/model";
import { ORIGINAL_PDF_STYLE, STANDARD_STYLE, templates } from "../../shared/resume/templates";
import { sampleResume } from "../../src/features/editor/data/sample";

const output = path.resolve("output/qa/expanded");
await mkdir(output, { recursive: true });
const results: unknown[] = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  async function exportResume(resume: Resume, filename: string) {
    const bytes = new Uint8Array(await renderPDF(browser, resume));
    const file = path.join(output, `${filename}.pdf`);
    await writeFile(file, bytes);
    const editable = await PDFDocument.load(bytes);
    assert.ok(editable.getPageCount() > 0);
    const task = getDocument({ data: bytes.slice(), isEvalSupported: false, useSystemFonts: false });
    const pdf = await task.promise;
    let text = "";
    let sidebarText = "",
      mainText = "";
    const pageSizes: Array<[number, number]> = [];
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      const plainText = (items: typeof content.items) =>
        items
          .map((item) => ("str" in item ? item.str : ""))
          .join("")
          .replace(/\s/g, "");
      if (resume.style.template === "sidebar") {
        // Rejoin each column across pages before checking markers that may split
        // at a page boundary; the other column must not interrupt that text.
        const columnBoundary = ((resume.style.margin + 50 + 9 / 2) * 72) / 25.4;
        sidebarText += plainText(
          content.items.filter((item) => "str" in item && item.transform[4] < columnBoundary),
        );
        mainText += plainText(
          content.items.filter((item) => "str" in item && item.transform[4] >= columnBoundary),
        );
      } else text += plainText(content.items);
      pageSizes.push([page.view[2], page.view[3]]);
    }
    if (resume.style.template === "sidebar") text = sidebarText + mainText;
    const attachments = await pdf.getAttachments();
    assert.equal(attachments, null);
    await pdf.destroy();
    return { file, text, pages: editable.getPageCount(), pageSizes };
  }
  for (const [index, template] of templates.entries()) {
    const resume = sampleResume();
    Object.assign(resume.profile, {
      wechat: "PaperCV-demo",
      expectedCity: "上海",
      expectedSalary: "20–30K",
      gender: "女",
    });
    Object.assign(resume.sections[0].entries[0], {
      department: "产品事业部",
      url: "https://example.com/product",
    });
    Object.assign(resume.sections[2].entries[0], {
      subtitle: "信息管理",
      degree: "本科",
      college: "管理学院",
      educationType: "全日制",
      schoolTags: "985、双一流",
    });
    resume.sections[0].entries.push({ ...blankEntry(), title: "HIDDEN_MARKER", visible: false });
    resume.sections.push({
      id: "research-demo",
      kind: "research",
      title: "研究经历",
      visible: true,
      entries: [
        {
          ...blankEntry(),
          title: "用户行为研究",
          description:
            '<p style="text-align:center">居中研究结论</p><ul><li>一级事项<ul><li>二级事项</li></ul></li></ul><p style="margin-left:40px"><a href="https://example.com/research">研究链接</a></p>',
        },
      ],
    });
    resume.style = {
      ...resume.style,
      ...template.defaults,
      template: template.id,
      infoStyle: (["labels", "icons", "dots", "outline", "tags", "simple"] as const)[index],
      headerDecoration: (["rule", "banner", "card", "side", "circle", "plain"] as const)[index],
      headingStyle: (["solid", "double", "dotted", "bracket", "pill", "flag"] as const)[index],
      paperStyle: (["frame", "rail", "soft", "corner", "plain", "frame"] as const)[index],
      entryLayout: index % 2 ? "one" : "two",
      entryPriority: index % 2 ? "location" : "time",
      dateFormat: DATE_FORMAT_OPTIONS[index][0],
      skillStyle: index % 2 ? "tags" : "icons",
    };
    const result = await exportResume(resume, `features-${template.id}`);
    for (const marker of [
      "林知夏",
      "产品事业部",
      "管理学院",
      "二级事项",
      "研究链接",
      "PaperCV-demo",
      "20–30K",
    ]) {
      assert.equal(result.text.split(marker).length - 1, 1, `${template.id}: missing or repeated ${marker}`);
    }
    assert.ok(!result.text.includes("HIDDEN_MARKER"));
    const date = formatDate("2023.07", resume.style.dateFormat);
    assert.ok(result.text.includes(date));
    const [width, height] = result.pageSizes[0];
    assert.ok(Math.abs(width - 595.28) < 2 && Math.abs(height - 841.89) < 2);
    execFileSync("pdftoppm", [
      "-f",
      "1",
      "-singlefile",
      "-scale-to",
      "1300",
      "-png",
      result.file,
      path.join(output, `features-${template.id}`),
    ]);
    results.push({ template: template.id, pages: result.pages });
    console.log(
      `PASS ${template.name}: new profile and entry fields, nested lists, hidden entry, formatting, PDF text and browser print output`,
    );
  }
  const long = sampleResume();
  long.style = {
    ...long.style,
    ...templates.find((t) => t.id === "sidebar")!.defaults,
    template: "sidebar",
    headingStyle: "table",
    skillStyle: "tags",
    moduleSpacing: 24,
    entrySpacing: 16,
    infoStyle: "labels",
    paperStyle: "rail",
    paper: "letter",
  };
  long.sections[0].entries[0].description = `<p style="text-align:justify">${Array.from({ length: 180 }, (_, i) => `正文成果第${i + 1}项：研究业务数据并持续优化产品体验。`).join("")}</p>`;
  long.sections[3].entries[0].description = `<p>${Array.from({ length: 100 }, (_, i) => `技能成果第${i + 1}项：交互设计与数据研究。`).join("")}</p>`;
  const stress = await exportResume(long, "features-sidebar-multipage");
  assert.ok(stress.pages >= 3);
  for (let i = 1; i <= 180; i++) assert.equal(stress.text.split(`正文成果第${i}项`).length - 1, 1);
  for (let i = 1; i <= 100; i++) assert.equal(stress.text.split(`技能成果第${i}项`).length - 1, 1);
  assert.ok(Math.abs(stress.pageSizes[0][0] - 612) < 2 && Math.abs(stress.pageSizes[0][1] - 792) < 2);
  execFileSync("pdftoppm", [
    "-f",
    String(stress.pages),
    "-singlefile",
    "-scale-to",
    "1300",
    "-png",
    stress.file,
    path.join(output, "features-sidebar-last-page"),
  ]);
  const standard = sampleResume();
  standard.style = { ...standard.style, ...STANDARD_STYLE };
  standard.sections[0].entries[0].url = "https://example.com/standard";
  const standardResult = await exportResume(standard, "features-standard");
  for (const marker of ["林知夏", "https://example.com/standard"])
    assert.equal(standardResult.text.split(marker).length - 1, 1);
  execFileSync("pdftoppm", [
    "-f",
    "1",
    "-singlefile",
    "-scale-to",
    "1300",
    "-png",
    standardResult.file,
    path.join(output, "features-standard"),
  ]);
  console.log(
    "PASS standard rendering exports with YaHei font, inline link, zero entry spacing and custom styles",
  );
  for (const [index, bulletStyle] of (["diamond", "circle", "square"] as const).entries()) {
    const mock = sampleResume();
    mock.style = {
      ...mock.style,
      ...ORIGINAL_PDF_STYLE,
      bulletStyle,
      dividerWidth: [0, 0.5, 2][index],
      bulletSize: [3.2, 5, 8][index],
    };
    Object.assign(mock.style, {
      entryPriority: index % 2 ? "location" : "time",
      entryLinkLayout: ["auto", "inline", "separate"][index],
      entryLinkAlign: index % 2 ? "left" : "right",
      entryMetaAlign: index % 2 ? "left" : "right",
      entryTitleAlign: index % 2 ? "right" : "left",
      entrySubtitleAlign: index % 2 ? "right" : "left",
    });
    mock.sections[0].entries[0].title = "长标题验证：" + "中文与 React TypeScript 混合经历标题".repeat(3);
    mock.sections[0].entries[0].url = "https://example.com/" + "long-path-".repeat(14);
    mock.sections[0].entries[0].description = `<ul><li>一级唯一标记<p>同一列表项的第二段</p><div><br></div><ul><li>二级唯一标记<ul><li>三级唯一标记</li></ul></li></ul></li><li>${"中英文混排 React TypeScript，验证自动换行。".repeat(50)}</li></ul><ol><li>有序唯一标记</li></ol><p>结束唯一标记</p>`;
    const result = await exportResume(mock, `mock-geometry-${bulletStyle}`);
    assert.ok(
      !result.text.includes("•"),
      "explicit markers must be drawn as geometry instead of font glyphs",
    );
    for (const marker of ["一级唯一标记", "二级唯一标记", "三级唯一标记", "有序唯一标记", "结束唯一标记"])
      assert.equal(result.text.split(marker).length - 1, 1);
    execFileSync("pdftoppm", [
      "-scale-to",
      "1100",
      "-png",
      result.file,
      path.join(output, `mock-geometry-${bulletStyle}`),
    ]);
    console.log(
      `PASS ${bulletStyle}: custom divider/marker settings, long heading/link, nested lists, blank line and multipage PDF`,
    );
  }
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        results,
        stressPages: stress.pages,
        assertions:
          "Text searchable, each marker once, rendered text and custom formatting, A4 and Letter dimensions",
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS ${stress.pages}-page Letter sidebar with long tagged skills, long body text and expanded spacing`,
  );
} finally {
  await browser.close();
}
