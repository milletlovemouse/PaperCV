import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, devices } from "playwright-core";
import { PDFDocument } from "pdf-lib";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { getPrintTitle } from "../../src/features/preview/lib/print-title";
import { STORAGE_KEY } from "../../shared/resume/model";
import { templates } from "../../shared/resume/templates";
import { sampleResume } from "../../src/features/editor/data/sample";
import { staticSite } from "../helpers/static-site";

const site = await staticSite();
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
await mkdir("output/qa/mobile-print", { recursive: true });
try {
  for (const [index, template] of templates.entries()) {
    const context = await browser.newContext({
      ...devices[index % 2 ? "iPhone 13" : "Pixel 7"],
      colorScheme: index % 2 ? "dark" : "light",
    });
    try {
      const resume = sampleResume();
      resume.title = `手机导出-${template.name}`;
      resume.profile.name = `手机预览${index}`;
      resume.profile.avatar =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGMwrV0CRwzEcQAlIhVh+0IWNAAAAABJRU5ErkJggg==";
      resume.style = {
        ...resume.style,
        ...template.defaults,
        template: template.id,
        showPageNumbers: true,
        margin: index % 2 ? 6 : 8,
        paper: index % 2 ? "letter" : "a4",
      };
      await context.addInitScript(
        ({ key, resume }) => {
          localStorage.setItem(key, JSON.stringify(resume));
          const state = window as unknown as {
            printCalls: Array<{ active: boolean; title: string; text: string; elapsed: number }>;
            printMode: string;
            delayedTitles: string[];
            tapTime: number;
          };
          state.printCalls = [];
          state.delayedTitles = [];
          state.printMode = "open";
          document.addEventListener(
            "click",
            (event) => {
              if ((event.target as Element)?.closest(".export-button")) state.tapTime = performance.now();
            },
            true,
          );
          window.print = () => {
            state.printCalls.push({
              active: navigator.userActivation.isActive,
              title: document.title,
              text: document.querySelector(".current-print-document")?.textContent || "",
              elapsed: performance.now() - state.tapTime,
            });
            if (state.printMode === "noop") return;
            if (state.printMode === "throw") throw new Error("Printing unavailable");
            window.dispatchEvent(new Event("beforeprint"));
            if (state.printMode === "finish") {
              window.dispatchEvent(new Event("afterprint"));
              setTimeout(() => state.delayedTitles.push(document.title), 0);
            }
          };
        },
        { key: STORAGE_KEY, resume },
      );
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(site.url, { waitUntil: "networkidle" });
      await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
      await page
        .locator(".preview-panel .resume-avatar")
        .first()
        .evaluate((image) => (image as HTMLImageElement).decode());
      assert.equal(
        await page.title(),
        getPrintTitle(resume.title),
        "the title is already correct before any export or browser-menu print",
      );
      resume.title = `手机:改名/${template.name}`;
      await page.getByLabel("简历名称", { exact: true }).fill(resume.title);
      const expectedTitle = getPrintTitle(resume.title);
      await page.waitForFunction((title) => document.title === title, expectedTitle);
      const previousTitle = expectedTitle;
      await page.getByLabel("姓名", { exact: true }).fill(`最新手机快照${index}`);
      await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
      const saved = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
      const requests: string[] = [];
      const recordRequest = (request: { url: () => string }) => requests.push(request.url());
      context.on("request", recordRequest);
      const exportButton = page.getByRole("button", { name: "导出 PDF", exact: true });
      await exportButton.click();
      await page.waitForFunction(() => document.documentElement.dataset.currentPrint === "true");
      const calls = await page.evaluate(
        () =>
          (
            window as unknown as {
              printCalls: Array<{ active: boolean; title: string; text: string; elapsed: number }>;
            }
          ).printCalls,
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].active, true, "printing keeps the original tap activation");
      assert.equal(calls[0].title, expectedTitle);
      assert.match(calls[0].text, new RegExp(`最新手机快照${index}`));
      assert.equal(await page.locator('iframe[title="简历打印"]').count(), 0);
      assert.deepEqual(requests, [], "mobile export loads no second document or font resources");
      context.off("request", recordRequest);
      assert.equal(
        await page
          .locator(".current-print-document .paper-stack")
          .evaluate((node) => (node as HTMLElement).style.zoom),
        "1",
        "the snapshot removes screen zoom before entering print media",
      );
      // Duplicate clicks keep the original snapshot rather than opening another print job.
      await exportButton.click();
      assert.equal(
        await page.evaluate(() => (window as unknown as { printCalls: unknown[] }).printCalls.length),
        1,
      );
      await page.getByLabel("姓名", { exact: true }).fill(`打印后的编辑${index}`);
      assert.equal(
        await page.locator(".current-print-document .resume-name").innerText(),
        `最新手机快照${index}`,
        "print snapshot does not follow later edits",
      );
      // PDF generation also exercises beforeprint/afterprint, including cleanup.
      const bytes = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        displayHeaderFooter: true,
      });
      await writeFile(`output/qa/mobile-print/${template.id}.pdf`, bytes);
      const pdf = await PDFDocument.load(bytes);
      assert.equal(pdf.getTitle(), expectedTitle, "the serialized PDF metadata uses the resume title");
      assert.equal(pdf.getPageCount(), await page.locator(".preview-panel .paper-page").count());
      assert.ok(Math.abs(pdf.getPage(0).getWidth() - (resume.style.paper === "a4" ? 595.28 : 612)) < 2);
      const parsed = await getDocument({
        data: new Uint8Array(bytes),
        isEvalSupported: false,
        useSystemFonts: false,
      }).promise;
      const firstPage = await parsed.getPage(1);
      const firstContent = await firstPage.getTextContent();
      const name = firstContent.items.find((item) => "str" in item && item.str.startsWith("最"));
      assert.ok(name && "transform" in name);
      assert.ok(
        Math.abs(name.transform[4] - (resume.style.margin * 72) / 25.4) < 2,
        "PDF content keeps the configured margin without another website inset",
      );
      let text = "";
      for (let n = 1; n <= parsed.numPages; n++)
        text += (await (await parsed.getPage(n)).getTextContent()).items
          .map((item) => ("str" in item ? item.str : ""))
          .join("");
      const operations = await (await parsed.getPage(1)).getOperatorList();
      assert.ok(
        operations.fnArray.includes(OPS.paintImageXObject),
        "the photo is present in the printed snapshot",
      );
      await parsed.destroy();
      assert.equal(text.split(`最新手机快照${index}`).length - 1, 1);
      assert.doesNotMatch(text, /https?:|localhost|127\.0\.0\.1|MAKE YOUR NEXT MOVE|添加简历模块/);
      await page.locator(".current-print-document").waitFor({ state: "detached" });
      assert.equal(await page.title(), previousTitle);
      assert.equal(await page.getByLabel("姓名", { exact: true }).inputValue(), `打印后的编辑${index}`);
      assert.ok(saved, "saved resume is preserved");
      await page.evaluate(() => {
        (window as unknown as { printMode: string }).printMode = "finish";
      });
      await exportButton.click();
      await page.locator(".current-print-document").waitFor({ state: "detached" });
      await exportButton.click();
      assert.equal(
        await page.evaluate(() => (window as unknown as { printCalls: unknown[] }).printCalls.length),
        3,
        "synchronous afterprint does not retain a stale lock",
      );
      await page.waitForFunction(
        () => (window as unknown as { delayedTitles: string[] }).delayedTitles.length >= 2,
      );
      assert.deepEqual(
        await page.evaluate(() => (window as unknown as { delayedTitles: string[] }).delayedTitles),
        [expectedTitle, expectedTitle],
        "an early afterprint does not restore the site name before native code reads the title",
      );
      if (index === 0) {
        await page.evaluate(() => {
          (window as unknown as { printMode: string }).printMode = "noop";
        });
        await exportButton.click();
        await page
          .locator(".toast")
          .getByText(/浏览器未响应打印/)
          .waitFor();
        await page.locator(".current-print-document").waitFor({ state: "detached" });
        assert.equal(await page.title(), previousTitle);
        await page.getByRole("button", { name: "关闭提示", exact: true }).click();
        await page.evaluate(() => {
          (window as unknown as { printMode: string }).printMode = "throw";
        });
        await exportButton.click();
        await page
          .locator(".toast")
          .getByText(/浏览器无法调用打印/)
          .waitFor();
        assert.equal(await page.locator(".current-print-document").count(), 0);
        await page.getByRole("button", { name: "关闭提示", exact: true }).click();
        await page.evaluate(() => {
          (window as unknown as { printMode: string }).printMode = "finish";
        });
        await exportButton.click();
        await page.locator(".current-print-document").waitFor({ state: "detached" });
      }
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${template.id}: synchronous mobile call (${calls[0].elapsed.toFixed(1)}ms), no new requests, searchable PDF metadata, persistent title, early-afterprint and retry`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await site.close();
}
