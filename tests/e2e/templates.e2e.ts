import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { renderPDF } from "../helpers/print";
import { chromium } from "playwright-core";
import { STORAGE_KEY, type Resume } from "../../shared/resume/model";
import { templates } from "../../shared/resume/templates";
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
  assert.equal(await page.locator(".template-gallery .template-card").count(), 6);
  await page.screenshot({ path: path.join(output, "gallery.png") });
  await page
    .getByRole("radiogroup", { name: "模板布局筛选", exact: true })
    .getByRole("radio", { name: "双栏", exact: true })
    .click();
  assert.equal(await page.locator(".template-gallery .template-card").count(), 1);
  await page.getByRole("radio", { name: "内容", exact: true }).click();
  await page.getByRole("radio", { name: "模板", exact: true }).click();
  assert.equal(await page.locator(".template-gallery .template-card").count(), 1);
  await page
    .getByRole("radiogroup", { name: "模板布局筛选", exact: true })
    .getByRole("radio", { name: "全部", exact: true })
    .click();
  for (const template of templates) {
    await page.getByRole("radio", { name: `选择${template.name}模板`, exact: true }).click();
    await page.waitForFunction(
      (id) =>
        !!document.querySelector(`.preview-scroll .template-${id}`) &&
        document.documentElement.dataset.pdfReady === "true",
      template.id,
    );
    await assertGeometry();
    if (template.id === "sidebar") {
      const heading = await page
        .locator(".preview-scroll .paper-page .sidebar-document .entry-heading")
        .first()
        .evaluate((node) => {
          const title = node.querySelector(".entry-first-row > strong")!.getBoundingClientRect();
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
      ({ key, id }) => JSON.parse(localStorage.getItem(key) || "{}").style?.template === id,
      { key: STORAGE_KEY, id: template.id },
    );
    const resume: Resume = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
    const exported = await exportPDF(resume, template.id);
    assert.equal(exported.pages, await page.locator(".preview-scroll .paper-page").count());
    results.push({ template: template.id, pages: exported.pages });
    console.log(
      `PASS ${template.name}: gallery, geometry, searchable PDF, no data attachment (${exported.pages} pages)`,
    );
  }
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
  for (const template of templates) {
    const sparse = structuredClone(sample);
    sparse.style = { ...sparse.style, ...template.defaults, template: template.id, paper: "letter" };
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
  }
  console.log("PASS all six Letter layouts contain avatars and wrapped dates with minimal profile data");
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
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify({ results, stressPages: exported.pages, errors }, null, 2),
  );
} finally {
  await browser.close();
}
