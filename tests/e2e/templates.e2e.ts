import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { renderPDF } from "../helpers/print";
import { chromium } from "playwright-core";
import { STORAGE_KEY, type Resume } from "../../shared/resume/model";
import { templates } from "../../shared/resume/templates";
import {
  applyTemplatePreset,
  getSelectedTemplatePreset,
  templatePresets,
} from "../../shared/resume/template-presets";
import { sampleResume } from "../../src/features/editor/data/sample";

const output = path.resolve("output/qa/templates");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1540, height: 1150 } });
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const results: Array<{ template: string; pages: number }> = [];
const sample = sampleResume();
async function load(resume: Resume) {
  await page.getByText("已保存到本机", { exact: true }).waitFor({ state: "attached" });
  await page.evaluate(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), {
    key: STORAGE_KEY,
    resume,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
}
async function assertGeometry() {
  const issues = await page.locator(".preview-scroll .paper-page").evaluateAll((pages) => {
    const issues: string[] = [];
    for (const [index, page] of pages.entries()) {
      const bounds = page.getBoundingClientRect();
      const zoom = bounds.width / (page as HTMLElement).offsetWidth;
      const margin = parseFloat(getComputedStyle(page).paddingBottom) * zoom;
      for (const doc of page.querySelectorAll(".resume-document")) {
        for (const unit of doc.children) {
          const box = unit.getBoundingClientRect();
          if (box.bottom > bounds.bottom - margin + 2) issues.push(`page ${index + 1}: vertical overflow`);
          if (box.right > bounds.right + 1 || box.left < bounds.left - 1)
            issues.push(`page ${index + 1}: horizontal overflow`);
        }
      }
    }
    return issues;
  });
  assert.deepEqual(issues, []);
}
async function exportPDF(resume: Resume, name: string) {
  const bytes = await renderPDF(browser, resume);
  const file = path.join(output, `${name}.pdf`);
  await writeFile(file, bytes);
  const pdf = await PDFDocument.load(bytes);
  const text = await page.evaluate(
    async (data) => {
      const url = "/node_modules/pdfjs-dist/build/pdf.mjs";
      const pdfjs = await import(/* @vite-ignore */ url);
      pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
      const texts: string[] = [];
      const columns = { sidebar: "", main: "" };
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        texts.push(content.items.map((item: { str?: string }) => item.str || "").join(""));
        for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
          if (!item.str || !item.transform || item.transform[5] < 25) continue; // Exclude the page-number footer.
          columns[item.transform[4] < (70 * 72) / 25.4 ? "sidebar" : "main"] += item.str.replace(/\s/g, "");
        }
      }
      const attachments = await pdf.getAttachments();
      const attachment = attachments?.["papercv-resume.json"];
      const restored = attachment ? JSON.parse(new TextDecoder().decode(attachment.content)) : null;
      await pdf.destroy();
      return { text: texts.join("").replace(/\s/g, ""), columns, restored };
    },
    [...bytes],
  );
  assert.equal(text.restored, null);
  assert.equal(text.text.match(/林知夏/g)?.length, 1);
  assert.equal(text.text.match(/山海科技/g)?.length, 1);
  execFileSync("pdftoppm", [
    "-f",
    "1",
    "-singlefile",
    "-scale-to",
    "1200",
    "-png",
    file,
    path.join(output, `${name}-pdf`),
  ]);
  return { pages: pdf.getPageCount(), text: text.text, columns: text.columns, file };
}
try {
  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await load(sample);
  await page.getByRole("radio", { name: "模板", exact: true }).click();
  assert.equal(await page.locator(".template-gallery .template-card").count(), templatePresets.length);
  await page.screenshot({ path: path.join(output, "gallery.png") });
  await page
    .getByRole("radiogroup", { name: "模板布局筛选", exact: true })
    .getByRole("radio", { name: "双栏", exact: true })
    .click();
  assert.equal(
    await page.locator(".template-gallery .template-card").count(),
    templatePresets.filter((preset) => preset.category === "columns").length,
  );
  await page.getByRole("radio", { name: "内容", exact: true }).click();
  await page.getByRole("radio", { name: "模板", exact: true }).click();
  assert.equal(
    await page.locator(".template-gallery .template-card").count(),
    templatePresets.filter((preset) => preset.category === "columns").length,
  );
  await page
    .getByRole("radiogroup", { name: "模板布局筛选", exact: true })
    .getByRole("radio", { name: "全部", exact: true })
    .click();
  await page.getByText("已保存到本机", { exact: true }).waitFor({ state: "attached" });
  const initialSections = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).sections,
    STORAGE_KEY,
  );
  for (const template of templatePresets) {
    await page.getByRole("radio", { name: `选择${template.name}模板`, exact: true }).click();
    await page.waitForFunction(
      (id) =>
        !!document.querySelector(`.preview-scroll .template-${id}`) &&
        document.documentElement.dataset.pdfReady === "true",
      template.template,
    );
    await assertGeometry();
    const typographyIssues = await page.locator(".preview-scroll .paper-page").evaluateAll((pages, sizes) => {
      const issues: string[] = [];
      const groups: Array<[string, number]> = [
        [".resume-name", sizes.nameSize],
        [".section-title", sizes.sectionSize],
        [".entry-first-row strong", sizes.entryTitleSize],
        [
          ".body-unit, .resume-contact, .resume-role, .entry-date, .entry-subtitle, .entry-secondary-meta, .school-tags",
          sizes.fontSize,
        ],
      ];
      for (const paper of pages)
        for (const [selector, expected] of groups)
          for (const node of paper.querySelectorAll(selector))
            if (Math.abs(parseFloat(getComputedStyle(node).fontSize) - expected) > 0.01)
              issues.push(`${selector}: ${getComputedStyle(node).fontSize} / ${expected}`);
      if (sizes.infoStyle !== "auto" && sizes.infoStyle !== "labels")
        for (const paper of pages)
          for (const label of paper.querySelectorAll(".contact-label"))
            if (getComputedStyle(label).display !== "none")
              issues.push(`${sizes.infoStyle}: unexpected contact label`);
      return issues;
    }, template.defaults);
    assert.deepEqual(typographyIssues, [], `${template.id}: all four text levels match the preset`);
    if (template.id === "sidebar") {
      const heading = await page
        .locator(".preview-scroll .paper-page .sidebar-document .entry-heading")
        .first()
        .evaluate((node) => {
          const title = node.querySelector(".entry-first-row strong")!.getBoundingClientRect();
          const date = node.querySelector(".entry-date")!.getBoundingClientRect();
          const subtitle = node.querySelector(".entry-subtitle")!.getBoundingClientRect();
          const location = node.querySelector(".entry-secondary-meta")!.getBoundingClientRect();
          return {
            titleAndDateShareRow: Math.abs(title.top - date.top) < 5,
            subtitleAndLocationShareRow: Math.abs(subtitle.top - location.top) < 5,
            noOverlap: title.right <= date.left + 1 && subtitle.right <= location.left + 1,
            locationAtColumnEdge: Math.abs(location.right - node.getBoundingClientRect().right) < 1,
          };
        });
      assert.deepEqual(heading, {
        titleAndDateShareRow: true,
        subtitleAndLocationShareRow: true,
        noOverlap: true,
        locationAtColumnEdge: true,
      });
    }
    if (template.id === "timeline") {
      const dates = await page.locator(".preview-scroll .paper-page .entry-date").evaluateAll((nodes) =>
        nodes.map((node) => {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          const lines = new Set<number>();
          let text;
          while ((text = walker.nextNode())) {
            const range = document.createRange();
            range.selectNodeContents(text);
            for (const rect of range.getClientRects()) if (rect.width > 0) lines.add(Math.round(rect.top));
          }
          return { text: node.textContent, lines: lines.size };
        }),
      );
      assert.ok(dates.length >= 4);
      assert.ok(
        dates.every((date) => date.lines === 1),
        JSON.stringify(dates),
      );
    }
    const content = await page.locator(".preview-scroll .paper-page").allTextContents();
    assert.equal(content.join("").match(/山海科技/g)?.length, 1);
    await page
      .locator(".preview-scroll .paper-page")
      .first()
      .screenshot({ path: path.join(output, `${template.id}.png`) });
    await page.waitForFunction(
      ({ key, expected }) => {
        const style = JSON.parse(localStorage.getItem(key) || "{}").style;
        return style && Object.entries(expected).every(([key, value]) => style[key] === value);
      },
      { key: STORAGE_KEY, expected: template.defaults },
    );
    const resume: Resume = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
    assert.deepEqual(resume.style, applyTemplatePreset(sample.style, template.id));
    assert.deepEqual(resume.profile, sample.profile);
    assert.deepEqual(resume.sections, initialSections);
    assert.equal(getSelectedTemplatePreset(resume.style)?.id, template.id);
    assert.equal(
      await page
        .getByRole("radio", { name: `选择${template.name}模板`, exact: true })
        .getAttribute("aria-checked"),
      "true",
    );
    const exported = await exportPDF(resume, template.id);
    assert.equal(exported.pages, await page.locator(".preview-scroll .paper-page").count());
    results.push({ template: template.id, pages: exported.pages });
    console.log(
      `PASS ${template.name}: gallery, geometry, searchable PDF, no data attachment (${exported.pages} pages)`,
    );
  }
  // Restored JSON identifies the selected preset without a new storage field.
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "模板", exact: true }).click();
  assert.equal(
    await page.getByRole("radio", { name: "选择黑白速览模板", exact: true }).getAttribute("aria-checked"),
    "true",
  );
  const customized = structuredClone(sample);
  customized.style = {
    ...applyTemplatePreset(sample.style, "academic-serif"),
    accent: "#123456",
    paper: "letter",
    showPageNumbers: false,
  };
  await load(customized);
  await page.getByRole("radio", { name: "模板", exact: true }).click();
  assert.match(await page.locator(".active-template-detail").innerText(), /已自定义/);
  await page.getByRole("radio", { name: "选择商务蓝调模板", exact: true }).click();
  await page.waitForFunction(
    ({ key }) => JSON.parse(localStorage.getItem(key) || "{}").style?.accent === "#334e68",
    { key: STORAGE_KEY },
  );
  const switched: Resume = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  assert.deepEqual(switched.style, applyTemplatePreset(customized.style, "business-blue"));
  await page.keyboard.press("ControlOrMeta+z");
  await page.getByText("当前 · 人文书写 · 已自定义", { exact: true }).waitFor();
  await page.waitForFunction(
    ({ key }) => JSON.parse(localStorage.getItem(key) || "{}").style?.accent === "#123456",
    { key: STORAGE_KEY },
  );
  const undone: Resume = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  assert.deepEqual(undone.style, customized.style);
  console.log(
    "PASS preset JSON restore, custom appearance, complete style reset, retained paper/page-number preferences and undo",
  );

  const sidebar = {
    ...sample,
    style: {
      ...sample.style,
      ...templates.find((t) => t.id === "sidebar")!.defaults,
      template: "sidebar" as const,
    },
  };
  await load(sidebar);
  assert.match(await page.locator(".preview-scroll .paper-page .sidebar-document").innerText(), /浙江大学/);
  assert.doesNotMatch(
    await page.locator(".preview-scroll .paper-page .sidebar-document").innerText(),
    /山海科技/,
  );
  assert.match(await page.locator(".preview-scroll .paper-page .main-document").innerText(), /山海科技/);
  await page
    .locator(".preview-scroll .paper-page .sidebar-document .section-heading")
    .filter({ hasText: "教育经历" })
    .click();
  await page.getByLabel("学校名称", { exact: true }).first().waitFor();
  await page
    .locator(".preview-scroll .paper-page .main-document .section-heading")
    .filter({ hasText: "工作经历" })
    .click();
  await page.getByLabel("公司名称", { exact: true }).first().waitFor();
  console.log("PASS both sidebar columns target the correct structured editor");

  const long = structuredClone(sidebar);
  const sideText = Array.from({ length: 160 }, (_, i) => `侧栏成果${i + 1}：研究数据分析与交互设计。`).join(
    "",
  );
  const mainText = Array.from(
    { length: 260 },
    (_, i) => `正文成果${i + 1}：推动产品体验优化与业务增长。`,
  ).join("");
  long.sections.find((s) => s.kind === "skills")!.entries[0].description = `<p>${sideText}</p>`;
  long.sections.find((s) => s.kind === "work")!.entries[0].description = `<p>${mainText}</p>`;
  await load(long);
  assert.ok((await page.locator(".preview-scroll .paper-page").count()) >= 3);
  await assertGeometry();
  for (const [column, expected] of [
    ["sidebar", sideText],
    ["main", mainText],
  ]) {
    const text = (
      await page.locator(`.preview-scroll .paper-page .${column}-document .body-unit`).allTextContents()
    ).join("");
    assert.ok(text.includes(expected), `${column} text was lost or duplicated during pagination`);
  }
  const exported = await exportPDF(long, "sidebar-multipage");
  assert.equal(exported.pages, await page.locator(".preview-scroll .paper-page").count());
  assert.ok(exported.columns.sidebar.includes(sideText), "PDF sidebar text lost or duplicated");
  assert.ok(exported.columns.main.includes(mainText), "PDF main text lost or duplicated");
  await page.getByRole("button", { name: "导入简历" }).click();
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name: "sidebar.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(long)),
  });
  await page.getByText("已找到完整的可编辑数据").waitFor();
  await page.getByRole("button", { name: /确认导入/ }).click();
  await page.waitForFunction(
    () =>
      !!document.querySelector(".preview-scroll .template-sidebar") &&
      document.documentElement.dataset.pdfReady === "true",
  );
  await assertGeometry();
  console.log(
    `PASS independent two-column pagination and JSON round trip (${exported.pages} pages, no missing or repeated text)`,
  );
  for (const template of templatePresets) {
    const sparse = structuredClone(sample);
    sparse.style = { ...applyTemplatePreset(sparse.style, template.id), paper: "letter" };
    sparse.profile = {
      ...sparse.profile,
      role: "",
      phone: "",
      email: "",
      location: "",
      website: "",
      summary: "",
      avatar:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    };
    sparse.sections[0].entries[0].description = "";
    sparse.sections[0].entries[0].subtitle = "";
    sparse.sections[0].entries[0].location = "";
    sparse.sections[0].entries[0].start = "2022.07";
    sparse.sections[0].entries[0].end = "2026.11";
    sparse.sections[0].entries[0].url = "https://example.com/portfolio";
    await load(sparse);
    await assertGeometry();
    const containment = await page
      .locator(".preview-scroll .paper-page")
      .first()
      .evaluate((paper) => {
        const identity = paper.querySelector(".resume-identity")!;
        const avatar = identity.querySelector(".resume-avatar")!;
        const heading = paper.querySelector(".entry-heading")!;
        const date = heading.querySelector(".entry-date")!;
        return {
          avatar: avatar.getBoundingClientRect().bottom <= identity.getBoundingClientRect().bottom + 1,
          date: date.getBoundingClientRect().bottom <= heading.getBoundingClientRect().bottom + 1,
        };
      });
    assert.equal(containment.avatar, true, `${template.id}: avatar overlaps the following section`);
    assert.equal(containment.date, true, `${template.id}: date overflows its entry`);
    assert.equal(
      await page.locator('.preview-scroll .paper-page a[href="https://example.com/portfolio"]').count(),
      1,
    );
  }
  console.log(
    "PASS all 36 Letter presets contain avatars, wrapped dates and related links with minimal profile data",
  );
  for (const id of [
    "modern-creative",
    "editorial-portfolio",
    "sidebar-card",
    "sidebar-light",
    "compact-campus",
  ]) {
    const portrait = structuredClone(sample);
    portrait.style = applyTemplatePreset(portrait.style, id);
    portrait.profile.avatar =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    portrait.sections[1].entries[0].url = "https://example.com/portfolio";
    await load(portrait);
    await assertGeometry();
    const overlaps = await page.locator(".preview-scroll .resume-identity").evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const avatar = node.querySelector(".resume-avatar")!.getBoundingClientRect();
        const parts = [...node.querySelectorAll(".resume-name, .resume-role, .contact-item")];
        return parts
          .filter((part) => {
            const box = part.getBoundingClientRect();
            return (
              box.width &&
              box.height &&
              box.left < avatar.right - 1 &&
              box.right > avatar.left + 1 &&
              box.top < avatar.bottom - 1 &&
              box.bottom > avatar.top + 1
            );
          })
          .map((part) => part.textContent);
      }),
    );
    assert.deepEqual(overlaps, [], `${id}: photo overlaps full profile data`);
    await page
      .locator(".preview-scroll .paper-page")
      .first()
      .screenshot({ path: path.join(output, `${id}-portrait.png`) });
  }
  console.log(
    "PASS decorated headers and round/circle photos contain full contact information without overlap",
  );
  for (const templateId of ["sidebar", "timeline"] as const) {
    for (const [dateFormat, fontSize, paper, entryPriority] of [
      ["numeric", 16, "a4", "time"],
      ["chinese", 16, "letter", "time"],
      ["chinese", 16, "a4", "location"],
    ] as const) {
      const detailed = structuredClone(sample);
      detailed.style = {
        ...detailed.style,
        ...templates.find((template) => template.id === templateId)!.defaults,
        template: templateId,
        dateFormat,
        fontSize,
        paper,
        entryPriority,
      };
      for (const section of detailed.sections) {
        for (const entry of section.entries) {
          entry.start = "2024-03-01";
          entry.end = "2024-08-31";
          entry.location = "浙江省杭州市西湖区";
        }
      }
      await load(detailed);
      await assertGeometry();
      const issues = await page.locator(".preview-scroll .paper-page .entry-heading").evaluateAll((nodes) => {
        const issues: string[] = [];
        for (const node of nodes) {
          const heading = node.getBoundingClientRect();
          for (const part of node.querySelectorAll(".entry-date-part")) {
            const bounds = part.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(part);
            const lines = new Set(
              [...range.getClientRects()]
                .filter((rect) => rect.width > 0)
                .map((rect) => Math.round(rect.top)),
            );
            if (lines.size !== 1) issues.push(`split date segment: ${part.textContent}`);
            if (
              bounds.left < heading.left - 1 ||
              bounds.right > heading.right + 1 ||
              bounds.bottom > heading.bottom + 1
            )
              issues.push(`date outside heading: ${part.textContent}`);
          }
          const first = node.querySelector(".entry-first-row")!;
          const last = node.querySelector(".entry-second-row");
          if (
            last &&
            getComputedStyle(first).display !== "contents" &&
            last.getBoundingClientRect().top < first.getBoundingClientRect().bottom - 1
          )
            issues.push("heading rows overlap");
        }
        return issues;
      });
      assert.deepEqual(issues, [], `${templateId}/${dateFormat}/${entryPriority}/${paper}`);
    }
  }
  console.log(
    "PASS sidebar/timeline: 16px full numeric and Chinese dates, both metadata priorities, long locations and A4/Letter containment",
  );

  await load(sidebar);
  await page.getByRole("radio", { name: "模板", exact: true }).click();
  await page.screenshot({ path: path.join(output, "editor-sidebar.png") });
  for (const theme of ["light", "dark"] as const) {
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: theme,
    });
    try {
      await mobile.addInitScript(({ key, sample }) => localStorage.setItem(key, JSON.stringify(sample)), {
        key: STORAGE_KEY,
        sample,
      });
      const phone = await mobile.newPage();
      phone.on("pageerror", (error) => errors.push(error.message));
      await phone.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
      await phone.getByRole("radio", { name: "模板", exact: true }).click();
      assert.equal(await phone.locator(".template-gallery .template-card").count(), templatePresets.length);
      for (const [name, category] of [
        ["单栏", "single"],
        ["双栏", "columns"],
        ["紧凑", "compact"],
      ] as const) {
        await phone
          .getByRole("radiogroup", { name: "模板布局筛选", exact: true })
          .getByRole("radio", { name, exact: true })
          .click();
        assert.equal(
          await phone.locator(".template-gallery .template-card").count(),
          templatePresets.filter((preset) => preset.category === category).length,
        );
      }
      await phone.getByRole("radio", { name: "选择一页求职模板", exact: true }).click();
      await phone.waitForFunction(
        () =>
          document.documentElement.dataset.pdfReady === "true" &&
          !!document.querySelector(".preview-scroll .template-compact"),
      );
      assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await phone.screenshot({ path: path.join(output, `gallery-mobile-${theme}.png`) });
    } finally {
      await mobile.close();
    }
  }
  console.log("PASS 36 preset cards and category filters on mobile in light/dark themes");
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify({ results, stressPages: exported.pages, errors }, null, 2),
  );
} finally {
  await browser.close();
}
