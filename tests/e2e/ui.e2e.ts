import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
await mkdir("output/ui-refactor", { recursive: true });
try {
  for (const width of [1305, 390]) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        viewport: { width, height: 955 },
        colorScheme: theme,
        isMobile: width === 390,
        hasTouch: width === 390,
      });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
        const disclosure = page.getByRole("button", { name: "个人资料 · 选填", exact: true });
        await disclosure.focus();
        await disclosure.press("Enter");
        await page.getByLabel("民族", { exact: true }).fill("测试民族");
        await disclosure.press("Space");
        assert.equal(await page.getByLabel("民族", { exact: true }).isVisible(), false);
        await disclosure.press("Enter");
        assert.equal(await page.getByLabel("民族", { exact: true }).inputValue(), "测试民族");
        const profileHeader = page.locator("#edit-profile .module-header");
        await profileHeader.focus();
        await profileHeader.press("ArrowDown");
        assert.equal(
          await page
            .locator(".module-header")
            .nth(1)
            .evaluate((node) => node === document.activeElement),
          true,
        );
        await page.keyboard.press("Enter");
        await page.getByLabel("公司名称", { exact: true }).first().waitFor();
        await page.locator(".paper-page .resume-name").first().click();
        await page.getByLabel("姓名", { exact: true }).waitFor();
        const content = page.getByRole("radio", { name: "内容", exact: true });
        await content.focus();
        await content.press("ArrowDown", { delay: 80 });
        const templates = page.getByRole("radio", { name: "模板", exact: true });
        await page.waitForFunction(() =>
          document.querySelector('[role="radio"][data-state="checked"]')?.textContent?.includes("模板"),
        );
        assert.equal(await templates.getAttribute("aria-checked"), "true");
        await templates.press("ArrowDown", { delay: 80 });
        const style = page.getByRole("radio", { name: "排版", exact: true });
        await page.getByRole("radiogroup", { name: "纸张尺寸" }).waitFor();
        assert.equal(await style.getAttribute("aria-checked"), "true");
        const slider = page.getByRole("slider", { name: "字号", exact: true });
        const sliderBox = await slider.boundingBox();
        assert.ok(sliderBox && sliderBox.width >= 7 && sliderBox.height >= 7, "slider thumb remains visible");
        const trackBox = await page.locator(".ui-slider-track").first().boundingBox();
        assert.ok(trackBox && trackBox.width > 100 && trackBox.height >= 3, "slider track has a usable size");
        await slider.press("Home");
        const minimum = Number(await slider.getAttribute("aria-valuemin"));
        assert.equal(Number(await slider.getAttribute("aria-valuenow")), minimum);
        await slider.press("ArrowRight");
        assert.ok(Number(await slider.getAttribute("aria-valuenow")) > minimum);
        if (width === 390) {
          await slider.scrollIntoViewIfNeeded();
          const thumb = await slider.boundingBox();
          assert.ok(thumb && thumb.width >= 18 && thumb.height >= 18, "touch slider has a visible handle");
          const beforeDrag = await slider.getAttribute("aria-valuenow");
          const client = await context.newCDPSession(page);
          const x = thumb.x + thumb.width / 2;
          const y = thumb.y + thumb.height / 2;
          await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
          await client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + 60, y }],
          });
          await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          assert.notEqual(
            await slider.getAttribute("aria-valuenow"),
            beforeDrag,
            "touch dragging changes the value",
          );
          await client.detach();
        }
        await page.getByRole("button", { name: "小留白（8 mm）", exact: true }).click();
        const pageMargin = page.getByRole("slider", { name: "页边距", exact: true });
        assert.equal(await pageMargin.getAttribute("aria-valuenow"), "8");
        await pageMargin.press("Home");
        assert.equal(await pageMargin.getAttribute("aria-valuenow"), "6");
        await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
        const padding = await page
          .locator(".preview-panel .paper-page")
          .first()
          .evaluate((node) => parseFloat(getComputedStyle(node).paddingLeft));
        assert.ok(Math.abs(padding - (6 * 96) / 25.4) < 1, "preview uses the same compact margin");
        const pageNumbers = page.getByRole("switch", { name: "显示页码", exact: true });
        await pageNumbers.focus();
        const initiallyChecked = await pageNumbers.getAttribute("aria-checked");
        await pageNumbers.press("Space");
        assert.notEqual(await pageNumbers.getAttribute("aria-checked"), initiallyChecked);
        await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
        assert.equal(
          (await page.locator(".preview-panel .paper-page-number").count()) > 0,
          initiallyChecked !== "true",
        );
        await page.screenshot({
          path: `output/ui-refactor/page-number-${width}-${theme}.png`,
          animations: "disabled",
        });
        const a4 = page.getByRole("radio", { name: /^A4/ });
        await a4.focus();
        await a4.press("ArrowRight", { delay: 80 });
        const letter = page.getByRole("radio", { name: /Letter/ });
        assert.equal(await letter.getAttribute("aria-checked"), "true");
        await letter.press("Space");
        assert.equal(await letter.getAttribute("aria-checked"), "true", "selected choices cannot be cleared");
        await page.screenshot({
          path: `output/ui-refactor/style-${width}-${theme}.png`,
          animations: "disabled",
        });
        const newButton = page.getByRole("button", { name: "新建", exact: true });
        await newButton.click();
        const confirm = page.getByRole("alertdialog");
        const cancel = confirm.getByRole("button", { name: "取消", exact: true });
        await cancel.waitFor();
        assert.equal(await cancel.evaluate((node) => node === document.activeElement), true);
        await page.screenshot({
          path: `output/ui-refactor/confirm-${width}-${theme}.png`,
          animations: "disabled",
        });
        await page.keyboard.press("Escape");
        await confirm.waitFor({ state: "hidden" });
        assert.equal(await newButton.evaluate((node) => node === document.activeElement), true);
        await content.click();
        await disclosure.click();
        assert.equal(
          await page.getByLabel("民族", { exact: true }).inputValue(),
          "测试民族",
          "cancel preserves resume",
        );
        await page.getByRole("button", { name: "导入简历", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        assert.equal(
          await page
            .getByRole("button", { name: "导入简历", exact: true })
            .evaluate((node) => node === document.activeElement),
          true,
        );
        await page
          .locator('input[type="file"][accept*="image"]')
          .setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("invalid") });
        const notice = page.locator(".toast");
        await notice.waitFor();
        assert.match(await notice.innerText(), /照片读取失败/);
        await page.screenshot({
          path: `output/ui-refactor/content-${width}-${theme}.png`,
          animations: "disabled",
        });
        await page.getByRole("button", { name: "关闭提示", exact: true }).click();
        await notice.waitFor({ state: "hidden" });
        assert.deepEqual(errors, []);
        console.log(
          `PASS unified UI: disclosures, accordion, radios, slider, focus return, cancel and toast (${width}, ${theme})`,
        );
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
