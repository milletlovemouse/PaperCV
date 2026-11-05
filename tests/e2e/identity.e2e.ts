import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { normalizeResume, type Resume } from "../../shared/resume/model";
import { STANDARD_STYLE, templates } from "../../shared/resume/templates";

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/__identity-test", (route) =>
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
    import ResumePreview from "/src/features/preview/components/ResumePreview.tsx";
    import { blankResume } from "/shared/resume/model.ts";
    import "/node_modules/@fontsource-variable/noto-sans-sc/index.css";
    import "/node_modules/@fontsource-variable/noto-serif-sc/index.css";
    import "/src/styles/base.css";
    import "/src/styles/templates.css";
    import "/src/styles/layout.css";
    import "/src/styles/presentation.css";
    function Fixture() {
      const [resume, setResume] = React.useState(() => {
        const value = blankResume();
        value.profile = { ...value.profile, name: "陈见山", role: "前端研发工程师", phone: "13800000000",
          email: "hello@example.com", location: "广州", website: "github.com/example",
          birthday: "1999-12", gender: "男", ethnic: "汉族", politicalStatus: "共青团员" };
        value.sections = [{ id: "skills", title: "专业技能", kind: "skills", visible: true,
          entries: [{ id: "skill", title: "应用开发", subtitle: "前端开发", location: "广州",
            start: "2024-01", end: "至今", url: "example.com",
            description: "<ul><li>熟练使用 TypeScript、React、Vue 开发应用程序</li></ul>" }] }];
        return value;
      });
      window.updateFixture = patch => setResume(value => ({ ...value,
        sections: value.sections.map(section => ({ ...section, entries: section.entries.map(entry => ({ ...entry, ...patch.entry })) })),
        profile: { ...value.profile, ...patch.profile }, style: { ...value.style, ...patch.style } }));
      return React.createElement(ResumePreview, { resume });
    }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Fixture));
  </script></body></html>`,
  }),
);
async function update(patch: {
  profile?: Partial<Resume["profile"]>;
  style?: Partial<Resume["style"]>;
  entry?: Partial<Resume["sections"][number]["entries"][number]>;
}) {
  await page.evaluate((patch) => {
    (window as unknown as { updateFixture: (patch: unknown) => void }).updateFixture(patch);
  }, patch);
  await page.waitForFunction(() => document.documentElement.dataset.pdfReady === "true");
}
const identity = page.locator(".paper-page .resume-identity");
try {
  await page.goto("http://127.0.0.1:5173/__identity-test", { waitUntil: "networkidle" });
  await identity.waitFor();
  for (const template of templates) {
    await update({ style: { template: template.id } });
    assert.deepEqual(await identity.locator(".contact-row").allTextContents(), [
      "电话13800000000邮箱hello@example.com城市广州",
      "网站github.com/example",
      "生日1999-12性别男民族汉族政治面貌共青团员",
      "求职意向前端研发工程师",
    ]);
    const geometry = await identity.evaluate((root) => {
      const name = root.querySelector(".resume-name")!;
      const rows = [...root.querySelectorAll(".contact-row")];
      return {
        display: getComputedStyle(root).display,
        nameSize: getComputedStyle(name).fontSize,
        align: getComputedStyle(name).textAlign,
        color: getComputedStyle(name).color,
        lefts: [name, ...rows].map((node) => Math.round(node.getBoundingClientRect().left)),
        tops: [name, ...rows].map((node) => node.getBoundingClientRect().top),
        labels: [...root.querySelectorAll(".contact-label")].map((node) => getComputedStyle(node).display),
        separators: rows.map((row) => getComputedStyle(row.lastElementChild!, "::after").content),
      };
    });
    assert.equal(geometry.display, "block", template.id);
    assert.equal(geometry.nameSize, "20px", template.id);
    assert.equal(geometry.align, "left", template.id);
    assert.equal(geometry.color, "rgb(0, 0, 0)", template.id);
    assert.equal(new Set(geometry.lefts).size, 1, template.id);
    assert.ok(
      geometry.tops.every((top, i) => i === 0 || top > geometry.tops[i - 1]),
      template.id,
    );
    assert.ok(
      geometry.labels.every((display) => display === "none"),
      template.id,
    );
    assert.ok(
      geometry.separators.every((content) => content === "none"),
      template.id,
    );
    const colors = await page
      .locator(".paper-page")
      .evaluateAll((pages) =>
        pages.flatMap((paper) =>
          [
            ...paper.querySelectorAll(
              ".resume-contact,.section-heading,.body-unit,.entry-first-row > span,.entry-second-row",
            ),
          ].map((node) => getComputedStyle(node).color),
        ),
      );
    assert.ok(
      colors.every((color) => color === "rgb(0, 0, 0)"),
      `${template.id}: resume text must be black`,
    );
    assert.equal(
      await page
        .locator(".paper-page .bullet-unit")
        .evaluate((node) => getComputedStyle(node, "::before").color),
      "rgb(0, 0, 0)",
      template.id,
    );
  }
  console.log("PASS reference field grouping, left alignment and typography across six templates");

  await update({
    profile: {
      phone: "",
      email: "",
      location: "",
      birthday: "",
      gender: "",
      ethnic: "",
      politicalStatus: "",
    },
  });
  assert.equal(await identity.locator(".contact-row").count(), 2);
  await update({ profile: { website: "" } });
  assert.equal(await identity.locator(".contact-row").count(), 1);
  console.log("PASS empty fields and empty groups leave no extra rows or separators");

  await update({
    profile: {
      phone: "13800000000",
      email: "hello@example.com",
      location: "广州",
      website: "github.com/example",
      birthday: "1999-12",
      gender: "男",
      ethnic: "汉族",
      politicalStatus: "共青团员",
    },
  });
  for (const layout of ["auto", "stacked", "split", "inline"] as const) {
    for (const align of ["left", "center", "right"] as const) {
      await update({ style: { headerLayout: layout, nameAlign: align, contactAlign: align } });
      assert.equal(
        await identity.locator(".identity-main").evaluate((node) => getComputedStyle(node).textAlign),
        align,
      );
      assert.equal(
        await identity.locator(".resume-contact").evaluate((node) => getComputedStyle(node).textAlign),
        align,
      );
      const rowBounds = await identity.locator(".contact-row").evaluateAll((nodes) =>
        nodes.map((node) => {
          const bounds = node.getBoundingClientRect();
          return { top: bounds.top, bottom: bounds.bottom };
        }),
      );
      assert.ok(
        rowBounds.every((row, index) => index === 0 || row.top >= rowBounds[index - 1].bottom - 0.5),
        `${layout}/${align}: contact groups must occupy separate lines`,
      );
    }
  }
  await update({
    style: {
      headerLayout: "auto",
      nameAlign: "auto",
      contactAlign: "auto",
      nameSize: 25,
      profileColor: "#123456",
    },
  });
  assert.equal(
    await identity.locator(".resume-name").evaluate((node) => getComputedStyle(node).fontSize),
    "25px",
  );
  assert.equal(
    await identity.locator(".resume-name").evaluate((node) => getComputedStyle(node).color),
    "rgb(18, 52, 86)",
  );
  console.log("PASS explicit layout, alignment, name size and color settings still apply");

  await update({ style: STANDARD_STYLE });
  const standard = await page.locator(".paper-page").evaluate((paper) => {
    const css = getComputedStyle(paper);
    const doc = paper.querySelector(".resume-document")!;
    const entry = paper.querySelector(".entry-heading")!;
    const first = entry.querySelector(".entry-first-row")!.getBoundingClientRect();
    const second = entry.querySelector(".entry-second-row")!.getBoundingClientRect();
    return {
      paddingTop: css.paddingTop,
      paddingLeft: css.paddingLeft,
      font: getComputedStyle(doc).fontFamily,
      fontSize: getComputedStyle(doc).fontSize,
      lineHeight: getComputedStyle(doc).lineHeight,
      headingSize: getComputedStyle(paper.querySelector(".section-title")!).fontSize,
      rowsSeparate: second.top >= first.bottom - 0.5,
      inlineLink: Boolean(entry.querySelector(".entry-second-row a[href]")),
      separateLinks: paper.querySelectorAll(".entry-link").length,
      bulletPadding: getComputedStyle(paper.querySelector(".bullet-unit")!).paddingLeft,
      bulletSpacing: getComputedStyle(paper.querySelector(".bullet-unit")!).paddingBottom,
      date: entry.querySelector(".entry-date")!.textContent,
      birthday: paper.querySelector(".contact-row:nth-child(3)")!.textContent,
    };
  });
  assert.ok(Math.abs(parseFloat(standard.paddingTop) - (12 * 96) / 25.4) < 0.1);
  assert.ok(Math.abs(parseFloat(standard.paddingLeft) - (13 * 96) / 25.4) < 0.1);
  assert.match(standard.font, /Microsoft YaHei/);
  assert.equal(standard.fontSize, "12px");
  assert.equal(standard.lineHeight, "20px");
  assert.equal(standard.headingSize, "14px");
  assert.equal(standard.rowsSeparate, true);
  assert.equal(standard.inlineLink, false, "a city and URL must not stack in the right column in auto mode");
  assert.equal(standard.separateLinks, 1);
  assert.equal(standard.bulletPadding, "20px");
  assert.equal(standard.bulletSpacing, "6px");
  assert.equal(standard.date, "2024.01 - 至今");
  assert.match(standard.birthday!, /1999-12/);
  assert.equal(
    normalizeResume({
      version: 1,
      profile: {},
      sections: [],
      style: STANDARD_STYLE,
    }).style.font,
    "yahei",
  );
  assert.equal(
    normalizeResume({
      version: 1,
      profile: {},
      sections: [],
      style: STANDARD_STYLE,
    }).style.entrySpacing,
    0,
  );
  console.log(
    "PASS measured standard rendering: font, margins, line heights, two-row headings and project links",
  );
  await update({ entry: { location: "" } });
  assert.equal(
    await page.locator(".paper-page .entry-second-row a").count(),
    1,
    "auto retains inline link when the secondary metadata slot is empty",
  );
  await update({ entry: { location: "广州" } });

  let combinations = 0;
  for (const template of templates)
    for (const entryPriority of ["time", "location"] as const) {
      for (const entryLayout of ["one", "two"] as const)
        for (const entryLinkLayout of ["auto", "inline", "separate"] as const) {
          for (const align of ["left", "right"] as const) {
            const url =
              entryLinkLayout === "inline"
                ? `https://example.com/${"long-path-".repeat(16)}`
                : "example.com/project";
            await update({
              entry: {
                title: "长标题：中文 React TypeScript 项目开发与协作".repeat(2),
                location: "广州",
                url,
              },
              style: {
                ...template.defaults,
                template: template.id,
                entryPriority,
                entryLayout,
                entryLinkLayout,
                entryLinkAlign: align,
                entryTitleAlign: align,
                entrySubtitleAlign: align === "left" ? "right" : "left",
                entryMetaAlign: align,
              },
            });
            const entry = page.locator(".paper-page .entry-heading");
            assert.equal(await page.locator(".paper-page a[href]").count(), 1);
            assert.equal(
              await entry.locator("a").count(),
              entryLayout === "two" && entryLinkLayout === "inline" ? 1 : 0,
            );
            const linkAlignment = await page
              .locator(".paper-page a[href]")
              .evaluate(
                (link) => getComputedStyle(link.closest(".entry-link, .entry-inline-link")!).textAlign,
              );
            assert.equal(
              linkAlignment,
              align,
              `${template.id}/${entryPriority}/${entryLayout}/${entryLinkLayout}: link alignment must be independent of subtitle alignment`,
            );
            assert.equal(
              await entry
                .locator(".entry-first-row > strong")
                .evaluate((node) => getComputedStyle(node).textAlign),
              align,
            );
            assert.ok(
              (await entry.locator(".entry-date").innerText()).includes(
                entryPriority === "time" ? "2024" : "广州",
              ),
            );
            const geometry = await entry.evaluate((node) => {
              const bounds = node.getBoundingClientRect();
              const children = [
                ...node.querySelectorAll(
                  ".entry-first-row > *, .entry-second-row > *, .entry-subtitle > *, .entry-secondary-meta > *",
                ),
              ];
              const overlap = [
                ".entry-first-row",
                ".entry-second-row",
                ".entry-subtitle",
                ".entry-secondary-meta",
              ].some((selector) => {
                const nodes = [...(node.querySelector(selector)?.children || [])].filter((el) =>
                  el.textContent?.trim(),
                );
                return nodes.some((a, i) =>
                  nodes.slice(i + 1).some((b) => {
                    return [...a.getClientRects()].some((x) =>
                      [...b.getClientRects()].some(
                        (y) =>
                          Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 &&
                          Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1,
                      ),
                    );
                  }),
                );
              });
              return {
                width: bounds.width,
                height: bounds.height,
                overlap,
                outside: children.some((el) => {
                  const r = el.getBoundingClientRect();
                  return r.left < bounds.left - 1 || r.right > bounds.right + 1;
                }),
              };
            });
            assert.equal(
              geometry.outside,
              false,
              `${template.id}/${entryPriority}/${entryLayout}/${entryLinkLayout}/${align}: field outside heading`,
            );
            assert.equal(
              geometry.overlap,
              false,
              `${template.id}/${entryPriority}/${entryLayout}/${entryLinkLayout}/${align}: fields overlap`,
            );
            await page.emulateMedia({ media: "print" });
            const printed = await entry.boundingBox();
            assert.ok(
              Math.abs(printed!.height - geometry.height) < 0.1 &&
                Math.abs(printed!.width - geometry.width) < 0.1,
            );
            await page.emulateMedia({ media: "screen" });
            combinations++;
          }
        }
    }
  console.log(
    `PASS ${combinations} entry layouts: both priorities, metadata/link placement, long titles/URLs, all templates and screen/print bounds`,
  );
  await update({ style: STANDARD_STYLE, entry: { title: "应用开发", location: "广州", url: "example.com" } });

  for (const bulletStyle of ["disc", "circle", "square", "diamond"] as const) {
    for (const [dividerWidth, bulletSize] of [
      [0, 2],
      [0.5, 3.5],
      [3, 8],
    ]) {
      await update({ style: { ...STANDARD_STYLE, dividerWidth, bulletSize, bulletStyle } });
      const geometry = () =>
        page
          .locator(".paper-page")
          .first()
          .evaluate((paper) => {
            const marker = getComputedStyle(paper.querySelector(".bullet-unit")!, "::before");
            const title = getComputedStyle(paper.querySelector(".section-title")!);
            return {
              size: parseFloat(marker.width),
              border: parseFloat(title.borderBottomWidth),
              paint: title.backgroundSize,
              content: marker.content,
              transform: marker.transform,
              fill: marker.backgroundColor,
              outline: marker.borderTopStyle,
            };
          });
      const screen = await geometry();
      assert.ok(Math.abs(screen.size - bulletSize) < 0.05);
      // Chromium quantizes fractional borders at the device pixel boundary.
      assert.ok(Math.abs(screen.border - dividerWidth) <= 0.5);
      assert.equal(
        screen.paint,
        `100% ${dividerWidth}px`,
        "fractional divider width is painted without border rounding",
      );
      assert.equal(screen.content, '""');
      assert.equal(screen.transform === "none", bulletStyle !== "diamond");
      assert.equal(screen.outline === "solid", bulletStyle === "circle");
      await page.emulateMedia({ media: "print" });
      assert.deepEqual(await geometry(), screen, "print must retain the same marker and divider geometry");
      await page.emulateMedia({ media: "screen" });
    }
  }
  await update({ style: STANDARD_STYLE });
  console.log(
    "PASS 12 marker/divider combinations retain identical screen and print geometry with real web fonts",
  );

  await update({ style: { template: "classic", nameSize: 20, profileColor: "" } });
  await mkdir("output/qa", { recursive: true });
  await page.screenshot({
    path: "output/qa/identity-layout.png",
    clip: { x: 0, y: 0, width: 800, height: 310 },
  });
  await page.emulateMedia({ media: "print" });
  assert.equal(await identity.locator(".contact-row").count(), 4);
  assert.equal(
    await identity.locator(".resume-name").evaluate((node) => getComputedStyle(node).textAlign),
    "left",
  );
  assert.deepEqual(errors, []);
  console.log("PASS print uses the same grouped identity layout; no runtime errors");
} finally {
  await browser.close();
}
