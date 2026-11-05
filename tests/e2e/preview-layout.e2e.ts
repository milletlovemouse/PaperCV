import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

// An isolated browser context uses sample content, without touching the user's resume.
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));

async function layout() {
  return page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(".preview-panel")!;
    const bounds = panel.getBoundingClientRect();
    const rail = document.querySelector(".rail")!.getBoundingClientRect();
    const paper = document.querySelector(".paper-page")!.getBoundingClientRect();
    const restore = document.querySelector(".restore-editor")?.getBoundingClientRect();
    const toolbar = document.querySelector(".preview-toolbar")!.getBoundingClientRect();
    return {
      width: bounds.width,
      left: bounds.left,
      right: bounds.right,
      railRight: rail.right,
      viewport: window.innerWidth,
      paperTop: paper.top,
      paperWidth: paper.width,
      toolbarBottom: toolbar.bottom,
      restoreBottom: restore?.bottom,
      editorVisible: getComputedStyle(document.querySelector(".editor-panel")!).visibility !== "hidden",
      zoom: parseInt(document.querySelector(".zoom-label")!.textContent!),
      text: [...document.querySelectorAll<HTMLElement>(".paper-page .resume-document")]
        .map((el) => el.innerText)
        .join(""),
    };
  });
}

async function focused(expectedText: string) {
  await page.waitForFunction(() => {
    const panel = document.querySelector(".preview-panel")!.getBoundingClientRect();
    const rail = document.querySelector(".rail")!.getBoundingClientRect();
    return (
      getComputedStyle(document.querySelector(".editor-panel")!).visibility === "hidden" &&
      panel.width > 200 &&
      panel.left >= 0 &&
      Math.abs(panel.left - rail.right) < 1 &&
      Math.abs(panel.right - window.innerWidth) < 1
    );
  });
  const state = await layout();
  assert.equal(state.editorVisible, false);
  assert.ok(Math.abs(state.left - state.railRight) < 1, "preview must occupy the remaining grid track");
  assert.ok(
    Math.abs(state.right - state.viewport) < 1,
    `preview must reach the right edge (${state.left}, ${state.right}, viewport ${state.viewport})`,
  );
  assert.ok(state.paperWidth > 200, "resume must remain visible");
  assert.ok(state.restoreBottom! <= state.toolbarBottom + 1, "restore button must stay inside toolbar");
  assert.ok(state.paperTop >= state.toolbarBottom, "toolbar must not cover the resume");
  assert.equal(state.text, expectedText);
}

try {
  for (const width of [1135, 1700, 800, 390]) {
    await page.setViewportSize({ width, height: 955 });
    await page.goto("http://127.0.0.1:5173/");
    await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
    const original = await layout();
    await page.getByRole("button", { name: "收起编辑面板", exact: true }).click();
    if (width === 1135) {
      const frames = await page.evaluate(async () => {
        const widths: number[] = [];
        for (let i = 0; i < 20; i++) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          widths.push(document.querySelector(".preview-panel")!.getBoundingClientRect().width);
        }
        return widths;
      });
      assert.ok(
        frames.some((value) => value > original.width + 1 && value < width - original.railRight - 1),
        "preview width must pass through intermediate sizes during collapse",
      );
      assert.equal(await page.locator(".editor-panel").getAttribute("inert"), "");
    }
    await focused(original.text);
    if (width >= 800) assert.ok((await layout()).zoom > 35, "collapsing must not force minimum zoom");
    await page.getByRole("button", { name: "返回编辑", exact: true }).click();
    assert.equal((await layout()).editorVisible, true);
    assert.equal((await layout()).text, original.text);

    await page.getByRole("button", { name: "专注预览", exact: true }).click();
    await focused(original.text);
    await page.getByRole("button", { name: "恢复编辑", exact: true }).click();
    assert.equal((await layout()).editorVisible, true);

    await page.getByRole("button", { name: "专注预览", exact: true }).click();
    await focused(original.text);
    await page.keyboard.press("Escape");
    assert.equal((await layout()).editorVisible, true);

    await page.getByRole("button", { name: "专注预览", exact: true }).click();
    await focused(original.text);
    await page.getByRole("radio", { name: "排版", exact: true }).click();
    assert.equal((await layout()).editorVisible, true);
    assert.equal(await page.getByRole("button", { name: "应用标准排版", exact: true }).count(), 1);
    console.log(
      `PASS ${width}px: collapse/focus, full-width preview, return/toggle/Escape/navigation, unchanged resume`,
    );
  }
  assert.deepEqual(errors, []);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.locator(".app-shell").evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await page.setViewportSize({ width: 1135, height: 955 });
  await page.getByRole("button", { name: "专注预览", exact: true }).click();
  await mkdir("output/qa", { recursive: true });
  await page.screenshot({ path: "output/qa/preview-layout-fixture.png" });
} finally {
  await browser.close();
}
