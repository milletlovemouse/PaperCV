import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { renderPDF } from "../helpers/print";
import { chromium } from "playwright-core";
import { STORAGE_KEY } from "../../shared/resume/model";

const output = path.resolve("output/qa");
await mkdir(output, { recursive: true });
await mkdir(path.resolve("output/pdf"), { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1480, height: 1020 }, acceptDownloads: true });
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const results: string[] = [];
const record = (name: string) => {
  results.push(name);
  console.log(`PASS ${name}`);
};
try {
  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
  await page.getByLabel("姓名", { exact: true }).fill("陈见山");
  await page.waitForFunction(
    () => document.querySelector(".paper-page .resume-name")?.textContent === "陈见山",
  );
  record("editing immediately updates preview");
  await page.screenshot({ path: path.join(output, "editor-desktop.png"), fullPage: true });
  await page.getByLabel("姓名", { exact: true }).fill("刷新前最新姓名");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByLabel("姓名", { exact: true }).inputValue(), "刷新前最新姓名");
  record("pending local changes survive immediate reload");
  await page.getByLabel("姓名", { exact: true }).fill("陈见山");
  const photoInput = page.locator('input[type="file"][accept*="image"]');
  for (let attempt = 0; attempt < 2; attempt++) {
    await photoInput.setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("invalid image"),
    });
    await page.getByRole("status").filter({ hasText: "照片读取失败" }).waitFor();
    assert.equal(await photoInput.inputValue(), "");
    await page.getByRole("button", { name: "关闭提示" }).click();
  }
  record("invalid photos show feedback, reset input and allow retry");
  await photoInput.setInputFiles({
    name: "valid.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 10;
        canvas.getContext("2d")!.fillRect(0, 0, 10, 10);
        return canvas.toDataURL("image/png").split(",")[1];
      }),
      "base64",
    ),
  });
  await page.getByRole("button", { name: "移除照片", exact: true }).waitFor({ state: "attached" });
  await page.locator(".profile-photo").hover();
  await page.getByRole("button", { name: "移除照片", exact: true }).click();
  record("valid photo upload still works after decode failures");

  await page.getByRole("button", { name: "模板", exact: true }).click();
  await page.getByRole("button", { name: /简约现代/ }).click();
  await page.waitForSelector(".template-modern .paper-page");
  await page.getByRole("button", { name: "排版", exact: true }).click();
  const fontSize = page.getByRole("slider", { name: "字号", exact: true });
  await fontSize.press("Home");
  for (let step = 0; step < 6; step++) await fontSize.press("ArrowRight");
  await page.getByRole("button", { name: /Letter/ }).click();
  await page.waitForFunction(
    () => Math.abs(parseFloat(getComputedStyle(document.querySelector(".paper-page")!).width) - 816) < 2,
  );
  record("templates, font sizes and Letter paper update preview");
  await page.getByRole("button", { name: /^A4/ }).click();
  await page.getByRole("button", { name: "内容", exact: true }).click();
  await page.locator(".paper-page .section-heading").filter({ hasText: "工作经历" }).click();
  await page.getByLabel("公司名称", { exact: true }).first().waitFor();
  await page.getByLabel("公司名称", { exact: true }).first().fill("远山设计科技");
  await page
    .getByRole("textbox", { name: "经历描述", exact: true })
    .first()
    .fill("主导产品设计，关键转化率提升 28%，每周节省 20 小时。");
  await page.waitForFunction(() =>
    document.querySelector(".paper-page")?.textContent?.includes("远山设计科技"),
  );
  record("preview click targets structured editor; rich description stays in sync");

  await page.getByRole("button", { name: "添加简历模块", exact: false }).click();
  await page.getByRole("dialog").getByRole("button", { name: "自定义模块" }).click();
  const newModule = page.locator(".module-card.expanded");
  await newModule.getByLabel("模块名称").fill("额外成果");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".paper-page .section-heading")].some((e) => e.textContent === "额外成果"),
  );
  await newModule.getByRole("button", { name: "隐藏模块", exact: true }).click();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll(".paper-page .section-heading")].some(
        (e) => e.textContent === "额外成果",
      ),
  );
  await page.locator(".preview-tools").getByRole("button", { name: "撤销", exact: true }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".paper-page .section-heading")].some((e) => e.textContent === "额外成果"),
  );
  record("adding and hiding modules works; undo restores visibility");
  await newModule.getByRole("button", { name: "删除模块", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确认", exact: true }).click();
  await page.getByRole("button", { name: "基本信息" }).click();
  await page.waitForTimeout(500);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  const pdfPath = path.resolve("output/pdf/papercv-example.pdf");
  await writeFile(pdfPath, await renderPDF(browser, saved));
  const pdf = await PDFDocument.load(await readFile(pdfPath));
  assert.ok(pdf.getPageCount() >= 1);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 595.28) < 2);
  const pdfText = await page.evaluate(
    async (data) => {
      const moduleURL = "/node_modules/pdfjs-dist/build/pdf.mjs";
      const pdfjs = await import(/* @vite-ignore */ moduleURL);
      pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        text +=
          content.items
            .filter((item: { str?: string }) => typeof item.str === "string")
            .map((item: { str: string }) => item.str)
            .join("") + "\n";
      }
      await pdf.destroy();
      return text;
    },
    Array.from(await readFile(pdfPath)),
  );
  await writeFile(path.join(output, "exported-text.txt"), pdfText);
  const compactText = pdfText.replace(/\s/g, "");
  assert.match(compactText, /陈见山/);
  assert.match(compactText, /远山设计科技/);
  assert.equal(compactText.match(/远山设计科技/g)?.length, 1);
  record("Browser print PDF is searchable Chinese text with correct A4 size and no duplicated text");
  execFileSync("pdftoppm", [
    "-f",
    "1",
    "-singlefile",
    "-scale-to",
    "1300",
    "-png",
    pdfPath,
    path.join(output, "exported-page"),
  ]);
  await page.getByLabel("姓名", { exact: true }).fill("临时更改");
  await page.getByRole("button", { name: "导入简历" }).click();
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name: "resume.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await page.getByText("已找到完整的可编辑数据").waitFor();
  await page.getByRole("button", { name: /确认导入/ }).click();
  await page.getByLabel("姓名", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("姓名", { exact: true }).inputValue(), "陈见山");
  await page.waitForTimeout(500);
  const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  assert.deepEqual(restored.profile, saved.profile);
  assert.deepEqual(restored.style, saved.style);
  assert.deepEqual(
    restored.sections.map((s: { title: string; entries: unknown[] }) => s.title),
    saved.sections.map((s: { title: string }) => s.title),
  );
  const contentWithoutIds = (sections: Array<{ entries: Array<Record<string, unknown>> }>) =>
    sections.map((section) => section.entries.map(({ id: _id, ...entry }) => entry));
  assert.deepEqual(contentWithoutIds(restored.sections), contentWithoutIds(saved.sections));
  record("JSON backup restores editable content and styles");

  const ordinary = await PDFDocument.create();
  const font = await ordinary.embedFont(StandardFonts.Helvetica);
  const ordinaryPage = ordinary.addPage([595.28, 841.89]);
  const lines = [
    "Alex Morgan",
    "Product Manager",
    "alex@example.com",
    "WORK EXPERIENCE",
    "Mountain Studio | 2022 - 2025",
    "Improved conversion by 28 percent.",
    "EDUCATION",
    "University of Design | Bachelor",
  ];
  lines.forEach((line, index) =>
    ordinaryPage.drawText(line, {
      x: 50,
      y: 770 - index * 27,
      font,
      size: index === 0 ? 22 : 12,
      color: rgb(0.1, 0.1, 0.1),
    }),
  );
  const ordinaryPath = path.join(output, "ordinary-resume.pdf");
  await writeFile(ordinaryPath, await ordinary.save());
  await page.getByRole("button", { name: "导入简历" }).click();
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles(ordinaryPath);
  await page.getByText("已识别模块、经历与段落", { exact: true }).waitFor();
  await page.getByRole("button", { name: /确认导入/ }).click();
  assert.equal(await page.getByLabel("姓名", { exact: true }).inputValue(), "Alex Morgan");
  await page.waitForFunction(() =>
    document.querySelector(".paper-page")?.textContent?.includes("Improved conversion"),
  );
  record("ordinary PDF imports text and detects section headings");

  // Long unbroken Chinese paragraphs exercise actual Range-based splitting.
  const longResume = structuredClone(saved);
  const longText = Array.from(
    { length: 150 },
    (_, i) => `第${i + 1}项成果：通过用户访谈和数据分析持续改进产品体验，推动跨部门协作并实现业务目标。`,
  ).join("");
  longResume.sections = [
    {
      id: "long",
      title: "长段落分页验证",
      kind: "custom",
      visible: true,
      entries: [
        {
          id: "long-entry",
          title: "分页项目",
          subtitle: "",
          location: "",
          start: "",
          end: "",
          description: `<p>${longText}</p>`,
        },
      ],
    },
  ];
  await page.getByText("已保存到本机", { exact: true }).waitFor({ state: "attached" });
  await page.evaluate(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), {
    key: STORAGE_KEY,
    resume: longResume,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
  assert.ok((await page.locator(".paper-page").count()) >= 3);
  const renderedText = await page.locator(".paper-page .body-unit").allTextContents();
  assert.ok(renderedText.join("").includes(longText));
  assert.equal(renderedText.join("").match(/第150项成果/g)?.length, 1);
  const overflowing = await page.locator(".paper-page").evaluateAll((pages) =>
    pages.some((page) => {
      const doc = page.querySelector<HTMLElement>(".resume-document")!;
      return doc.getBoundingClientRect().bottom > page.getBoundingClientRect().bottom - 10;
    }),
  );
  assert.equal(overflowing, false);
  await page.screenshot({ path: path.join(output, "multipage.png"), fullPage: true });
  record("long Chinese paragraphs paginate without dropped or duplicated characters");
  await page.getByText("已保存到本机", { exact: true }).waitFor({ state: "attached" });
  await page.evaluate(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), {
    key: STORAGE_KEY,
    resume: saved,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
  await page.screenshot({ path: path.join(output, "editor-final.png"), fullPage: true });
  await page.setViewportSize({ width: 900, height: 850 });
  await page.screenshot({ path: path.join(output, "editor-compact.png"), fullPage: true });
  for (const [sectionCount, entriesPerSection] of [
    [40, 1],
    [30, 5],
  ]) {
    const limited = structuredClone(saved);
    limited.sections = Array.from({ length: sectionCount }, (_, index) => ({
      ...saved.sections[0],
      id: `limit-section-${index}`,
      title: `边界模块 ${index}`,
      visible: false,
      entries: Array.from({ length: entriesPerSection }, (_, entryIndex) => ({
        ...saved.sections[0].entries[0],
        id: `limit-entry-${index}-${entryIndex}`,
      })),
    }));
    await page.getByText("已保存到本机", { exact: true }).waitFor({ state: "attached" });
    await page.evaluate(({ key, resume }) => localStorage.setItem(key, JSON.stringify(resume)), {
      key: STORAGE_KEY,
      resume: limited,
    });
    await page.reload({ waitUntil: "networkidle" });
    const addModule = page.getByRole("button", { name: "添加简历模块", exact: false });
    assert.equal(await addModule.isDisabled(), true);
    if (entriesPerSection === 5) {
      await page.locator(".module-card .module-header").nth(1).click();
      assert.equal(await page.locator(".add-entry").first().isDisabled(), true);
      assert.equal(
        await page
          .getByRole("button", { name: /最多添加 150 条经历/ })
          .first()
          .isDisabled(),
        true,
      );
    }
  }
  record("module and entry limits prevent backups that cannot be re-imported");
  assert.deepEqual(errors, []);
  record("no browser runtime errors");
  await writeFile(
    path.join(output, "test-results.json"),
    JSON.stringify({ results, pages: pdf.getPageCount(), errors }, null, 2),
  );
} finally {
  await browser.close();
}
