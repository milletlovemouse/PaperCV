import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { sampleResume } from "../../src/features/editor/data/sample";
import { templates } from "../../shared/resume/templates";
import { STORAGE_KEY } from "../../shared/resume/model";
import { renderPDF } from "../helpers/print";
import { staticSite } from "../helpers/static-site";

const site = await staticSite();
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const output = path.resolve("output/qa/static-print");
await mkdir(output, { recursive: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  context.on("request", (request) => requests.push(request.url()));
  const resume = sampleResume();
  resume.title = "纯前端导出测试";
  await context.addInitScript(
    ({ key, resume }) => {
      if (window.parent === window) localStorage.setItem(key, JSON.stringify(resume));
      else
        window.print = () => {
          document.documentElement.dataset.printCalled = "true";
          document.documentElement.dataset.parentPrintTitle = window.parent.document.title;
        };
    },
    { key: STORAGE_KEY, resume },
  );
  await page.goto(site.url, { waitUntil: "networkidle" });
  const originalTitle = await page.title();
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
  await page.getByLabel("姓名", { exact: true }).fill("即时编辑快照");
  await page.getByRole("button", { name: "导出 PDF", exact: true }).click();
  const frame = page.frameLocator('iframe[title="简历打印"]');
  await frame.locator('html[data-print-called="true"]').waitFor();
  assert.equal(await frame.locator(".paper-page .resume-name").innerText(), "即时编辑快照");
  assert.equal(await frame.locator(".topbar").count(), 0);
  assert.match(page.frames()[1].url(), /\/papercv\/\?print=/);
  assert.equal(await page.frames()[1].evaluate(() => document.title), resume.title);
  assert.equal(
    await frame.locator("html").getAttribute("data-parent-print-title"),
    resume.title,
    "The top-level title must match the resume when print() is called",
  );
  assert.equal(await page.title(), resume.title);
  await page.getByRole("button", { name: "导出 PDF", exact: true }).click();
  assert.equal(await page.locator('iframe[title="简历打印"]').count(), 1);
  // Cancellation uses the same afterprint event as a completed save.
  await page.frames()[1].evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await page.locator('iframe[title="简历打印"]').waitFor({ state: "detached" });
  assert.equal(await page.title(), originalTitle, "Restore the editor title after cancelling print");
  assert.equal(await page.getByLabel("姓名", { exact: true }).inputValue(), "即时编辑快照");
  await page.waitForTimeout(600);
  const saved = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  assert.equal(JSON.parse(saved!).profile.name, "即时编辑快照");
  await page.getByRole("button", { name: "导出 PDF", exact: true }).click();
  await frame.locator('html[data-print-called="true"]').waitFor();
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY), saved);
  const currentFrame = page.frames()[1];
  const token = new URL(currentFrame.url()).searchParams.get("print");
  await page.evaluate(
    (token) => window.postMessage({ type: "papercv:error", token }, location.origin),
    token,
  );
  assert.equal(
    await page.locator('iframe[title="简历打印"]').count(),
    1,
    "Reject messages from the wrong window",
  );
  await currentFrame.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await page.locator('iframe[title="简历打印"]').waitFor({ state: "detached" });
  assert.ok(
    requests.every((url) => url.startsWith(new URL(site.url).origin) || /^(data|blob):/.test(url)),
    "No external runtime dependencies",
  );
  assert.ok(
    requests.every((url) => !url.includes("/api/")),
    "No backend requests",
  );
  assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(output, "static-editor.png") });
  console.log(
    "PASS static subpath: editor, live snapshot, print lifecycle/cancel/retry, source validation, storage preservation, no API or external requests",
  );

  const results: Array<{ template: string; pages: number }> = [];
  for (const template of templates) {
    const fixture = sampleResume();
    fixture.style = { ...fixture.style, ...template.defaults, template: template.id };
    const bytes = await renderPDF(browser, fixture, site.url);
    await writeFile(path.join(output, `${template.id}.pdf`), bytes);
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() > 0, `${template.id}: PDF must contain pages`);
    const [width, height] = fixture.style.paper === "letter" ? [612, 792] : [595.28, 841.89];
    for (const page of pdf.getPages()) {
      assert.ok(Math.abs(page.getWidth() - width) < 2, `${template.id}: incorrect paper width`);
      assert.ok(Math.abs(page.getHeight() - height) < 2, `${template.id}: incorrect paper height`);
    }
    const parsed = await getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;
    let text = "";
    try {
      for (let i = 1; i <= parsed.numPages; i++) {
        const content = await (await parsed.getPage(i)).getTextContent();
        text += content.items.map((item) => ("str" in item ? item.str : "")).join("");
      }
    } finally {
      await parsed.destroy();
    }
    assert.equal(
      text.replace(/\s/g, "").split(fixture.profile.name).length - 1,
      1,
      `${template.id}: searchable name must appear exactly once`,
    );
    results.push({ template: template.id, pages: pdf.getPageCount() });
    console.log(`PASS ${template.id}: static subpath PDF, paper dimensions and searchable text`);
  }
  const legacy = await PDFDocument.load(await readFile(path.join(output, "classic.pdf")));
  await legacy.attach(Buffer.from(JSON.stringify(resume)), "papercv-resume.json", {
    mimeType: "application/json",
  });
  const legacyInput = {
    name: "legacy.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await legacy.save()),
  };
  await page.getByRole("button", { name: "导入简历", exact: true }).click();
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles(legacyInput);
  await page.getByText("已找到完整的可编辑数据").waitFor();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "导入简历", exact: true }).click();
  await page.locator('input[type="file"][accept*=".pdf"]').setInputFiles(path.join(output, "classic.pdf"));
  await page.getByText("已识别模块、经历与段落").waitFor();
  console.log("PASS legacy editable PDF import and new printed PDF text import");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  assert.ok(requests.every((url) => !url.includes("/api/")));
  assert.deepEqual(errors, []);

  const failed = await browser.newContext();
  const invalidImageResume = sampleResume();
  invalidImageResume.profile.avatar = "data:image/png;base64,AAAA";
  await failed.addInitScript(
    ({ key, resume }) => {
      if (window.parent === window) localStorage.setItem(key, JSON.stringify(resume));
      else
        window.print = () => {
          document.documentElement.dataset.printCalled = "true";
        };
    },
    { key: STORAGE_KEY, resume: invalidImageResume },
  );
  const failedPage = await failed.newPage();
  await failedPage.goto(site.url, { waitUntil: "networkidle" });
  await failedPage.getByRole("button", { name: "导出 PDF", exact: true }).click();
  await failedPage
    .locator(".toast")
    .getByText("简历打印排版失败，请检查内容或图片后重试", { exact: true })
    .waitFor();
  assert.equal(await failedPage.locator('iframe[title="简历打印"]').count(), 0);
  assert.equal(await failedPage.getByRole("button", { name: "导出 PDF", exact: true }).isEnabled(), true);
  await failedPage.getByRole("button", { name: "导入简历", exact: true }).click();
  await failedPage.locator('input[type="file"][accept*=".pdf"]').setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(resume)),
  });
  await failedPage.getByText("已找到完整的可编辑数据").waitFor();
  await failedPage.getByRole("button", { name: "确认导入", exact: true }).click();
  await failedPage.getByRole("button", { name: "导出 PDF", exact: true }).click();
  await failedPage
    .frameLocator('iframe[title="简历打印"]')
    .locator('html[data-print-called="true"]')
    .waitFor();
  await failedPage.frames()[1].evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await failedPage.locator('iframe[title="简历打印"]').waitFor({ state: "detached" });
  await failed.close();
  console.log("PASS image decode failure cleans up and permits a successful retry after JSON recovery");
  await writeFile(path.join(output, "results.json"), JSON.stringify({ results, errors }, null, 2));
} finally {
  await browser.close();
  await site.close();
}
