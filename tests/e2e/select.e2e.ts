import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
await mkdir("output/select", { recursive: true });
try {
  for (const width of [1280, 390]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 960 } });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
          console.error(error.message);
        });
        // Match Vite's dependency URL so the fixture and components share one Theme context.
        const selectModule = await (
          await context.request.get("http://127.0.0.1:5173/src/shared/ui/UISelect.tsx")
        ).text();
        const themeModule = selectModule.match(/from ["']([^"']*@radix-ui_themes\.js[^"']*)["']/)?.[1];
        assert.ok(themeModule, "Vite must resolve the Radix Themes module");
        await page.route("**/__select-test", (route) =>
          route.fulfill({
            contentType: "text/html",
            body: `<html data-theme="${theme}"><head><meta charset="UTF-8"><script type="module">
            import RefreshRuntime from "/@react-refresh";
            RefreshRuntime.injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => type => type;
            window.__vite_plugin_react_preamble_installed__ = true;
          </script></head><body><div id="root"></div><script type="module">
            import React from "/node_modules/.vite/deps/react.js";
            import ReactDOM from "/node_modules/.vite/deps/react-dom_client.js";
            import { Theme } from "${themeModule}";
            import { UISelect } from "/src/shared/ui/UISelect.tsx";
            import { SelectField } from "/src/shared/ui/SelectField.tsx";
            import DateField from "/src/shared/ui/DateFieldPicker.tsx";
            import "/src/styles/radix.css";
            import "/src/styles/base.css";
            import "/src/styles/theme.css";
            const h = React.createElement;
            function Fixture() {
              const [degree, setDegree] = React.useState("自定义学历");
              const [format, setFormat] = React.useState("template");
              const [month, setMonth] = React.useState("2023-07");
              const [day, setDay] = React.useState("1999-12-05");
              return h(Theme, { appearance: "${theme}", accentColor: "gray", className: "editor-theme" },
                h("main", { style: { width: "min(340px, calc(100vw - 48px))", margin: "0 auto", paddingTop: 40, display: "grid", gap: 20 } },
                  h(SelectField, { label: "学历", value: degree, options: ["本科", "硕士", "博士"], onChange: setDegree }),
                  h(UISelect, { label: "禁用选择", value: "disabled", options: [["disabled", "不可选择"]], disabled: true, onChange: () => {} }),
                  h(UISelect, { label: "日期格式", value: format, displayValue: format === "template" ? "numeric" : format, options: [["numeric", "2026.01"], ["chinese", "2026年1月"]], onChange: setFormat }),
                  h("output", { "data-testid": "format-value" }, format),
                  h("button", { type: "button", onClick: () => setFormat("template") }, "恢复继承格式"),
                  h(DateField, { label: "年月", value: month, onChange: setMonth }),
                  h(DateField, { label: "具体日期", value: day, onChange: setDay }),
                  h(DateField, { label: "结束时间", value: "至今", disabled: true, onChange: () => {} }),
                  h("button", { type: "button" }, "外部区域")));
            }
            ReactDOM.createRoot(document.getElementById("root")).render(h(Fixture));
          </script></body></html>`,
          }),
        );
        await page.goto("http://127.0.0.1:5173/__select-test", { waitUntil: "networkidle" });
        const menu = page.locator(".ui-select-content");
        const calendar = page.locator(".papercv-calendar");
        const year = page.getByRole("combobox", { name: "选择年份", exact: true });
        const degree = page.getByRole("combobox", { name: "学历", exact: true });
        assert.equal(await degree.innerText(), "自定义学历");
        assert.equal(await page.getByRole("combobox", { name: "禁用选择" }).isDisabled(), true);
        await degree.click();
        await menu.waitFor();
        assert.equal(
          await menu.getByRole("option", { name: "自定义学历", exact: true }).getAttribute("data-state"),
          "checked",
        );
        assert.equal(
          await menu.evaluate((element) => getComputedStyle(element).backgroundColor),
          theme === "dark" ? "rgb(10, 10, 10)" : "rgb(255, 255, 255)",
        );
        await page.screenshot({ path: `output/select/field-${width}-${theme}.png`, animations: "disabled" });
        await page.keyboard.press("Home");
        await page.waitForFunction(() => document.activeElement?.textContent === "不填写");
        await page.keyboard.press("Enter");
        await menu.waitFor({ state: "hidden" });
        assert.equal(await degree.innerText(), "不填写");
        assert.equal(await degree.evaluate((element) => element === document.activeElement), true);
        await degree.click();
        await menu.getByRole("option", { name: "硕士", exact: true }).click();
        await menu.waitFor({ state: "hidden" });
        assert.equal(await degree.innerText(), "硕士");

        const format = page.getByRole("combobox", { name: "日期格式", exact: true });
        assert.equal(await format.innerText(), "2026.01");
        await format.click();
        await menu.getByRole("option", { name: "2026.01", exact: true }).click();
        await menu.waitFor({ state: "hidden" });
        assert.equal(await page.getByTestId("format-value").innerText(), "numeric");
        await page.getByRole("button", { name: "恢复继承格式", exact: true }).click();
        await format.focus();
        await format.press("Enter");
        await menu.waitFor();
        await page.keyboard.press("Enter");
        await menu.waitFor({ state: "hidden" });
        assert.equal(await page.getByTestId("format-value").innerText(), "numeric");

        await page.getByRole("textbox", { name: "年月", exact: true }).click();
        await year.click();
        await menu.waitFor();
        assert.equal(await menu.getByRole("option").count(), 201);
        const bounds = await menu.boundingBox();
        assert.ok(
          bounds && bounds.x >= 11 && bounds.x + bounds.width <= width - 11 && bounds.height <= 266,
          JSON.stringify(bounds),
        );
        await page.screenshot({ path: `output/select/year-${width}-${theme}.png`, animations: "disabled" });
        await page.keyboard.press("Home");
        await page.waitForFunction(() => document.activeElement?.textContent === "1900年");
        await page.keyboard.press("Enter");
        await menu.waitFor({ state: "hidden" });
        assert.equal(await year.innerText(), "1900年");
        assert.equal(await page.getByRole("button", { name: "上一年", exact: true }).isDisabled(), true);
        await year.click();
        await page.keyboard.press("End");
        await page.waitForFunction(() => document.activeElement?.textContent === "2100年");
        await page.keyboard.press("Enter");
        await menu.waitFor({ state: "hidden" });
        assert.equal(await year.innerText(), "2100年");
        assert.equal(await page.getByRole("button", { name: "下一年", exact: true }).isDisabled(), true);
        await year.click();
        await menu.getByRole("option", { name: "2020年", exact: true }).click();
        await menu.waitFor({ state: "hidden" });
        assert.equal(await calendar.isVisible(), true);
        await calendar.locator(".react-datepicker__month-text").nth(6).click();
        await calendar.waitFor({ state: "hidden" });
        assert.equal(await page.getByRole("textbox", { name: "年月", exact: true }).inputValue(), "2020-07");

        await page.getByRole("textbox", { name: "具体日期", exact: true }).click();
        await year.click();
        await menu.getByRole("option", { name: "2000年", exact: true }).click();
        await menu.waitFor({ state: "hidden" });
        await page.getByRole("combobox", { name: "选择月份", exact: true }).click();
        await menu.getByRole("option", { name: "2月", exact: true }).click();
        await menu.waitFor({ state: "hidden" });
        assert.equal(await calendar.isVisible(), true);
        await calendar
          .locator(".react-datepicker__day--029:not(.react-datepicker__day--outside-month)")
          .click();
        await calendar.waitFor({ state: "hidden" });
        assert.equal(
          await page.getByRole("textbox", { name: "具体日期", exact: true }).inputValue(),
          "2000-02-29",
        );
        await page.getByRole("textbox", { name: "具体日期", exact: true }).click();
        await year.click();
        await page.keyboard.press("Escape");
        await menu.waitFor({ state: "hidden" });
        assert.equal(await calendar.isVisible(), true);
        assert.equal(await year.evaluate((element) => element === document.activeElement), true);
        await page.keyboard.press("Escape");
        await calendar.waitFor({ state: "hidden" });
        await page.getByRole("textbox", { name: "具体日期", exact: true }).click();
        await page.mouse.click(20, 20);
        await calendar.waitFor({ state: "hidden" });
        await page.getByRole("button", { name: "清除具体日期", exact: true }).click();
        assert.equal(await page.getByRole("textbox", { name: "具体日期", exact: true }).inputValue(), "");
        assert.equal(await page.getByRole("textbox", { name: "结束时间", exact: true }).isDisabled(), true);
        assert.deepEqual(errors, []);
        console.log(
          `PASS ${width}px ${theme}: custom/empty/disabled selects, 1900–2100 years, leap day, nested Escape, focus and outside click`,
        );
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
