import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { templates } from "../../shared/resume/templates";

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
// A fresh context and a standalone React fixture never access saved resume data.
const context = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => {
  errors.push(error.message);
  console.error(error.message);
});
await page.route("**/__rich-text-test", (route) =>
  route.fulfill({
    contentType: "text/html",
    body: `<html><head><meta charset="UTF-8"><script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script></head><body><div id="root"></div><script type="module">
    import React from "/node_modules/.vite/deps/react.js";
    import ReactDOM from "/node_modules/.vite/deps/react-dom_client.js";
    import RichText from "/src/features/rich-text/components/RichText.tsx";
    import ResumePreview from "/src/features/preview/components/ResumePreview.tsx";
    import { blankResume } from "/shared/resume/model.ts";
    import "/src/styles/base.css";
    import "/src/styles/templates.css";
    import "/src/styles/layout.css";
    import "/src/styles/presentation.css";
    function Fixture() {
      const [resume, setResume] = React.useState(() => {
        const value = blankResume();
        value.sections = [{ id: "project", kind: "projects", title: "项目经历", visible: true,
          entries: [{ id: "entry", title: "视频聊天室", description: "", subtitle: "", location: "", start: "", end: "" }] }];
        return value;
      });
      const setDescription = html => setResume(value => ({ ...value,
        sections: [{ ...value.sections[0], entries: [{ ...value.sections[0].entries[0], description: html }] }] }));
      window.fixture = { setDescription, setTemplate: template => setResume(value => ({
        ...value, style: { ...value.style, template } })) };
      return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "420px 1fr", gap: "24px" } },
        React.createElement(RichText, { value: resume.sections[0].entries[0].description, onChange: setDescription }),
        React.createElement(ResumePreview, { resume }));
    }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Fixture));
  </script></body></html>`,
  }),
);
const editor = page.getByRole("textbox", { name: "经历描述", exact: true });
const rows = page.locator(".paper-page .body-unit[data-entry=entry]");
async function setDescription(html: string) {
  await page.evaluate((html) => {
    (window as unknown as { fixture: { setDescription: (html: string) => void } }).fixture.setDescription(
      html,
    );
  }, html);
  await page.waitForFunction((html) => {
    const editor = document.querySelector(".rich-content");
    return (
      editor?.textContent === new DOMParser().parseFromString(html, "text/html").body.textContent &&
      document.documentElement.dataset.pdfReady === "true"
    );
  }, html);
}
async function metrics() {
  return rows.evaluateAll((nodes) =>
    nodes.map((node) => {
      const element = node as HTMLElement;
      return {
        text: element.textContent,
        indent: parseFloat(element.style.getPropertyValue("--rich-indent")),
        padding: parseFloat(getComputedStyle(element).paddingLeft),
        bullet: element.classList.contains("bullet-unit"),
        marker: element.dataset.marker,
      };
    }),
  );
}
async function caret(selector: string) {
  await editor.evaluate((root, selector) => {
    const node = root.querySelector(selector)!.firstChild!;
    (root as HTMLElement).focus();
    window.getSelection()!.setBaseAndExtent(node, 1, node, 1);
  }, selector);
}
try {
  await page.goto("http://127.0.0.1:5173/__rich-text-test", { waitUntil: "networkidle" });
  await editor.waitFor();
  // Covers normal, Chromium sibling-list and empty-wrapper list structures.
  for (const html of [
    "<ul><li>项目任务：<ul><li>封装 SDK</li><li>文件传输</li></ul></li><li>技术栈</li></ul>",
    "<ul><li>项目任务：</li><ul><li>封装 SDK</li><li>文件传输</li></ul><li>技术栈</li></ul>",
    "<ul><li>项目任务：</li><li><ul><li>封装 SDK</li><li>文件传输</li></ul></li><li>技术栈</li></ul>",
    "<ul><li>项目任务：<div><ul><li>封装 SDK</li><li>文件传输</li></ul></div></li><li>技术栈</li></ul>",
  ]) {
    await setDescription(html);
    const actual = await metrics();
    assert.deepEqual(
      actual.map((row) => row.text),
      ["项目任务：", "封装 SDK", "文件传输", "技术栈"],
    );
    assert.deepEqual(
      actual.map((row) => row.indent),
      [0, 20, 20, 0],
    );
    assert.deepEqual(
      actual.map((row) => row.marker),
      ["•", "•", "•", "•"],
    );
    assert.equal(await editor.locator("li").count(), 4, "no extra parent marker");
  }
  console.log("PASS nested lists preserve order, indentation and exactly one marker per item");
  await setDescription(
    "<ul><li><p>同一列表项第一段</p><p>同一列表项第二段</p><ul><li><div>二级第一段</div><div>二级第二段</div></li></ul></li></ul>",
  );
  const paragraphs = await metrics();
  assert.deepEqual(
    paragraphs.map((row) => row.bullet),
    [true, false, true, false],
  );
  assert.deepEqual(
    paragraphs.map((row) => row.padding),
    [20, 20, 40, 40],
    "all paragraphs in one list item share the same text inset",
  );
  console.log("PASS continuation paragraphs align with their list item and never gain another marker");
  for (const key of ["Enter", "Shift+Enter"]) {
    await setDescription("<ul><li>项目任务：<ul><li>封装 SDK</li></ul></li></ul>");
    const baselineTop = await rows.nth(1).evaluate((node) => node.getBoundingClientRect().top);
    await editor.evaluate((root) => {
      const text = root.querySelector("li")!.firstChild!;
      (root as HTMLElement).focus();
      window.getSelection()!.setBaseAndExtent(text, text.textContent!.length, text, text.textContent!.length);
    });
    await editor.press(key);
    const childTop = await rows.last().evaluate((node) => node.getBoundingClientRect().top);
    assert.ok(childTop - baselineTop >= 19, `${key} must add a visible line`);
    assert.equal(await editor.locator("li").count(), 2, "empty line must not add a bullet");
    if (key === "Enter") {
      assert.deepEqual(
        (await metrics()).map((row) => row.text),
        ["项目任务：", "", "封装 SDK"],
      );
      assert.equal((await metrics())[1].bullet, false);
      await page.keyboard.insertText("补充说明");
      assert.deepEqual(
        (await metrics()).map((row) => row.text),
        ["项目任务：", "补充说明", "封装 SDK"],
      );
      await editor.press("ControlOrMeta+z");
      assert.deepEqual(
        (await metrics()).map((row) => row.text),
        ["项目任务：", "", "封装 SDK"],
      );
      await editor.press("ControlOrMeta+z");
      assert.deepEqual(
        (await metrics()).map((row) => row.text),
        ["项目任务：", "封装 SDK"],
      );
      await editor.press("ControlOrMeta+Shift+z");
      assert.deepEqual(
        (await metrics()).map((row) => row.text),
        ["项目任务：", "", "封装 SDK"],
      );
    }
  }
  await setDescription("<ul><li>项目任务：</li><li><br><ul><li>封装 SDK</li></ul></li></ul>");
  assert.deepEqual(
    (await metrics()).map((row) => row.text),
    ["项目任务：", "", "封装 SDK"],
  );
  assert.equal((await metrics())[1].bullet, false);
  await setDescription("<ul><li>项目任务：<p></p><div></div><ul><li>封装 SDK</li></ul></li></ul>");
  assert.deepEqual(
    (await metrics()).map((row) => row.text),
    ["项目任务：", "", "", "封装 SDK"],
  );
  console.log(
    "PASS Enter keeps a blank paragraph, caret and history; soft breaks and existing empty blocks survive",
  );

  await setDescription(
    "<ul><li>项目任务：<ul><li>封装 SDK</li><li>文件传输</li></ul></li><li>技术栈</li></ul>",
  );

  for (const template of templates) {
    await page.evaluate((template) => {
      (window as unknown as { fixture: { setTemplate: (template: string) => void } }).fixture.setTemplate(
        template,
      );
    }, template.id);
    await page.waitForSelector(`.resume-preview.template-${template.id} .paper-page`);
    const actual = await metrics();
    assert.equal(actual[1].padding - actual[0].padding, template.id === "classic" ? 20 : 16, template.id);
  }
  console.log("PASS computed nested indentation survives pagination in all six templates");

  await setDescription(
    '<div style="margin-left:20px"><p style="margin-left:10px;text-align:right">累计缩进</p></div><blockquote><p>引用缩进</p></blockquote><ol><li>任务<ol><li>子任务</li></ol></li></ol>',
  );
  assert.deepEqual(
    (await metrics()).map((row) => row.indent),
    [30, 16, 0, 16],
  );
  assert.deepEqual(
    (await metrics()).slice(2).map((row) => row.marker),
    ["1.", "1."],
  );
  assert.equal(await rows.first().evaluate((node) => getComputedStyle(node).textAlign), "right");
  console.log("PASS paragraph margins accumulate; blockquotes, alignment and ordered lists survive");

  await setDescription("<ul><li>项目任务</li><li>封装 SDK</li><li>技术栈</li></ul>");
  await caret("li:nth-child(2)");
  await editor.press("Tab");
  await page.waitForFunction(() => document.querySelector(".paper-page .body-unit[style*='16px']") !== null);
  assert.deepEqual(
    (await metrics()).map((row) => row.indent),
    [0, 16, 0],
  );
  assert.equal(await editor.locator("li").count(), 3);
  assert.equal(await editor.evaluate((root) => root === document.activeElement), true);
  await editor.press("Shift+Tab");
  assert.deepEqual(
    (await metrics()).map((row) => row.indent),
    [0, 0, 0],
  );
  await editor.press("ControlOrMeta+z");
  assert.deepEqual(
    (await metrics()).map((row) => row.indent),
    [0, 16, 0],
  );
  await editor.press("ControlOrMeta+Shift+z");
  assert.deepEqual(
    (await metrics()).map((row) => row.indent),
    [0, 0, 0],
  );
  console.log("PASS Tab, Shift+Tab, undo and redo keep editor and preview in sync");

  await setDescription("<p>普通段落</p>");
  await caret("p");
  await editor.press("Tab");
  assert.ok((await metrics())[0].indent > 0);
  await editor.press("Shift+Tab");
  assert.equal((await metrics())[0].indent, 0);
  console.log("PASS paragraph keyboard indentation reaches preview");

  const longText = Array.from({ length: 220 }, (_, i) => `第${i + 1}项：通过数据分析持续改进产品体验。`).join(
    "",
  );
  await setDescription(`<ul><li>项目任务：<ul><li>${longText}</li></ul></li></ul>`);
  assert.ok((await page.locator(".paper-page").count()) > 1);
  const fragments = (await metrics()).slice(1);
  assert.ok(fragments.length > 1);
  assert.ok(fragments.every((row) => row.indent === 16));
  assert.equal(fragments.map((row) => row.text).join(""), longText);
  assert.equal(await rows.filter({ hasText: "第220项" }).count(), 1);
  await page.emulateMedia({ media: "print" });
  const printed = await metrics();
  assert.equal(printed[1].padding - printed[0].padding, 16);
  await page.emulateMedia({ media: "screen" });
  console.log("PASS long nested items retain indentation across pages and print styles");

  await setDescription(
    "<ul><li>项目任务：<ul><li>封装 SDK</li><li>文件传输</li></ul></li><li>技术栈</li></ul>",
  );
  await mkdir("output/qa", { recursive: true });
  await page.screenshot({ path: "output/qa/rich-text-indent.png", fullPage: true });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
