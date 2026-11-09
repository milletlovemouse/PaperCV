import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { renderPDF } from "../helpers/print";
import { chromium } from "playwright-core";
import { LAYOUT_DEFAULTS, STORAGE_KEY, type Resume } from "../../shared/resume/model";
import { templates } from "../../shared/resume/templates";
import { sampleResume } from "../../src/features/editor/data/sample";

const output = path.resolve("output/qa/layout");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1540, height: 1150 }, acceptDownloads: true });
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
async function ready() {
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
}
async function pick(label: string, name: string) {
  const group = page.getByRole("radiogroup", { name: label, exact: true });
  await group.getByRole("radio", { name, exact: true }).click();
  await ready();
  assert.equal(await group.getByRole("radio", { name, exact: true }).getAttribute("aria-checked"), "true");
}
async function saved() {
  await page.waitForTimeout(450);
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!) as Resume, STORAGE_KEY);
}
async function geometry() {
  assert.deepEqual(
    await page.locator(".preview-scroll .paper-page").evaluateAll((pages) =>
      pages.flatMap((paper) => {
        const bounds = paper.getBoundingClientRect();
        const zoom = bounds.width / (paper as HTMLElement).offsetWidth;
        const margin = parseFloat(getComputedStyle(paper).paddingBottom) * zoom;
        return [...paper.querySelectorAll(".resume-document .resume-unit")].flatMap((unit) => {
          const box = unit.getBoundingClientRect();
          return box.bottom > bounds.bottom - margin + 2 || box.right > bounds.right + 1 ? ["overflow"] : [];
        });
      }),
    ),
    [],
  );
}
try {
  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  for (const template of templates) {
    const resume = sampleResume();
    resume.style = { ...resume.style, ...template.defaults, template: template.id };
    await page.evaluate(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), {
      key: STORAGE_KEY,
      resume,
    });
    await page.reload({ waitUntil: "networkidle" });
    await ready();
    await page.getByRole("radio", { name: "排版", exact: true }).click();
    assert.equal(
      await page
        .locator(".style-panel")
        .getByRole("radio", { name: /^(默认|模板默认|自动)$/ })
        .count(),
      0,
    );
    for (const [label, selected, count] of [
      ["相关链接位置", "副标题同行", 2],
      ["相关链接对齐", "居右", 3],
    ] as const) {
      const group = page.getByRole("radiogroup", { name: label, exact: true });
      assert.equal(await group.getByRole("radio").count(), count);
      assert.equal(await group.getByRole("radio", { name: selected }).getAttribute("aria-checked"), "true");
    }
    for (const group of await page.locator(".layout-controls").getByRole("radiogroup").all()) {
      assert.equal(
        await group.getByRole("radio", { checked: true }).count(),
        1,
        `${template.id}: concrete layout choice must be selected`,
      );
    }
    for (const [alignment, label] of [
      ["left", "居左"],
      ["center", "居中"],
      ["right", "居右"],
    ] as const) {
      for (const group of ["姓名与求职意向", "联系方式对齐", "模块标题对齐", "正文对齐"])
        await pick(group, label);
      await pick("经历主标题对齐", label);
      await pick("经历副标题对齐", label);
      const actual = await page
        .locator(".preview-scroll .paper-page")
        .first()
        .evaluate((paper) =>
          [".identity-main", ".resume-contact", ".section-heading", ".body-unit"].map(
            (selector) => getComputedStyle(paper.querySelector(selector)!).textAlign,
          ),
        );
      // Legacy template values retain logical `start`, equivalent to left in this LTR document.
      assert.deepEqual(
        actual.map((value) => (value === "start" ? "left" : value)),
        [alignment, alignment, alignment, alignment],
        template.id,
      );
      // Check visible title placement too, including flex-based editorial headings.
      const placement = await page
        .locator(".preview-scroll .paper-page .section-heading")
        .first()
        .evaluate((heading) => {
          const text = heading.querySelector(".section-title")!.getBoundingClientRect();
          const box = heading.getBoundingClientRect();
          return { left: text.left - box.left, right: box.right - text.right, width: box.width };
        });
      if (alignment === "center")
        assert.ok(Math.abs(placement.left - placement.right) < 30, `${template.id}: heading not centered`);
      if (alignment === "right") assert.ok(placement.right < 15, `${template.id}: heading not right aligned`);
      const list = await page
        .locator(".preview-scroll .paper-page .bullet-unit")
        .first()
        .evaluate((node) => {
          const marker = getComputedStyle(node, "::before");
          return { markerPosition: marker.position, direction: getComputedStyle(node).flexDirection };
        });
      if (alignment !== "left") assert.equal(list.markerPosition, "static", template.id);
      if (alignment === "right") assert.equal(list.direction, "row-reverse", template.id);
      if (alignment === "center") {
        const offsets = await page
          .locator(".preview-scroll .paper-page .entry-heading")
          .evaluateAll((nodes) =>
            nodes.flatMap((node) => {
              const box = node.getBoundingClientRect();
              return [".entry-first-row strong", ".entry-subtitle"].flatMap((selector) => {
                const field = node.querySelector(selector);
                if (!field?.textContent) return [];
                const range = document.createRange();
                range.selectNodeContents(field);
                const text = range.getBoundingClientRect();
                return [Math.abs((text.left + text.right - box.left - box.right) / 2)];
              });
            }),
          );
        assert.ok(
          offsets.every((offset) => offset < 2),
          `${template.id}: centered against full column ${offsets}`,
        );
      }
      await geometry();
    }
    await pick("正文对齐", "两端");
    for (const [layout, label] of [
      ["stacked", "上下排列"],
      ["split", "左右分列"],
      ["inline", "姓名横排"],
    ] as const) {
      await pick("页眉布局", label);
      const display = await page
        .locator(".preview-scroll .paper-page .resume-identity")
        .first()
        .evaluate((el) => ({
          outer: getComputedStyle(el).display,
          inner: getComputedStyle(el.querySelector(".identity-main")!).display,
        }));
      assert.equal(display.outer, layout === "split" ? "grid" : "block");
      assert.equal(display.inner, layout === "inline" ? "flex" : "block");
      await geometry();
    }
    for (const [style, label] of [
      ["line", "下划线"],
      ["tint", "色块"],
      ["plain", "纯文字"],
    ] as const) {
      await pick("模块标题样式", label);
      const decoration = await page
        .locator(".preview-scroll .paper-page .section-heading")
        .first()
        .evaluate((el) => {
          const css = getComputedStyle(el);
          return {
            bottom: css.borderBottomWidth,
            left: css.borderLeftWidth,
            background: css.backgroundColor,
          };
        });
      assert.equal(parseFloat(decoration.bottom) > 0, style === "line");
      assert.equal(parseFloat(decoration.left) > 0, style === "tint");
      await geometry();
    }
    await page.getByRole("button", { name: "恢复模板默认", exact: true }).click();
    await ready();
    const restored = await saved();
    for (const [key, value] of Object.entries(LAYOUT_DEFAULTS))
      assert.equal(restored.style[key as keyof typeof LAYOUT_DEFAULTS], value);
    console.log(`PASS ${template.name}: 3 alignments, 3 header layouts, 3 title styles and reset`);
  }
  await pick("经历副标题对齐", "居右");
  await pick("经历标题", "单行标题");
  assert.equal(await page.getByRole("radiogroup", { name: "经历副标题对齐", exact: true }).count(), 0);
  assert.equal((await saved()).style.entrySubtitleAlign, "right");
  await pick("经历主标题对齐", "居中");
  await geometry();
  await pick("经历标题", "双行标题");
  assert.equal(
    await page
      .getByRole("radiogroup", { name: "经历副标题对齐", exact: true })
      .getByRole("radio", { name: "居右", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  // A visible example and a complete export/import round trip through the UI.
  await pick("页眉布局", "上下排列");
  await pick("姓名与求职意向", "居中");
  await pick("联系方式对齐", "居中");
  await pick("模块标题对齐", "居中");
  await pick("正文对齐", "两端");
  await pick("模块标题样式", "色块");
  await pick("相关链接对齐", "居中");
  const expected = await saved();
  assert.equal(expected.style.entryLinkAlign, "center");
  await page.reload({ waitUntil: "networkidle" });
  await ready();
  assert.deepEqual((await saved()).style, expected.style);
  await page.getByRole("radio", { name: "排版", exact: true }).click();
  await page.locator(".editor-panel").evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({ path: path.join(output, "layout-controls.png") });
  const file = path.join(output, "custom-layout.pdf");
  await writeFile(file, await renderPDF(browser, expected));
  const { readFile } = await import("node:fs/promises");
  const pdf = await PDFDocument.load(await readFile(file));
  assert.equal(pdf.getPageCount(), await page.locator(".preview-scroll .paper-page").count());
  execFileSync("pdftoppm", [
    "-f",
    "1",
    "-singlefile",
    "-scale-to",
    "1200",
    "-png",
    file,
    path.join(output, "custom-layout-pdf"),
  ]);
  const print = await context.newPage();
  await print.addInitScript((resume) => {
    window.__PRINT_RESUME__ = resume;
  }, expected);
  await print.goto("http://127.0.0.1:5173/?print=test", { waitUntil: "networkidle" });
  await print.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
  const computed = (root: Element) =>
    [".identity-main", ".resume-contact", ".section-heading", ".body-unit"].map((selector) => {
      const css = getComputedStyle(root.querySelector(selector)!);
      return { align: css.textAlign, background: css.backgroundColor, fontSize: css.fontSize };
    });
  assert.deepEqual(
    await print.locator(".paper-page").first().evaluate(computed),
    await page.locator(".preview-scroll .paper-page").first().evaluate(computed),
  );
  await print.close();
  await page.getByRole("button", { name: "恢复模板默认", exact: true }).click();
  await page.getByRole("button", { name: "导入简历", exact: true }).click();
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name: "layout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(expected)),
  });
  await page.getByText("已找到完整的可编辑数据").waitFor();
  await page.getByRole("button", { name: /确认导入/ }).click();
  await ready();
  assert.deepEqual((await saved()).style, expected.style);
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      { templates: 6, alignments: 3, headerLayouts: 3, titleStyles: 3, jsonRoundTrip: true, errors },
      null,
      2,
    ),
  );
  console.log("PASS persistence, PDF rendering consistency and JSON import restore custom layout");
} finally {
  await browser.close();
}
