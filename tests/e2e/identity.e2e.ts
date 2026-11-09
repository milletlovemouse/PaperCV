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
    import "/src/styles/layout.css";
    import "/src/styles/presentation.css";
    import "/src/styles/templates.css";
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
    assert.equal(geometry.color, "rgb(52, 88, 75)", template.id);
    assert.equal(
      await page
        .locator(".paper-page .section-heading")
        .first()
        .evaluate((node) => getComputedStyle(node).color),
      "rgb(52, 88, 75)",
      `${template.id}: unset title color follows theme`,
    );
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
            ...paper.querySelectorAll(".resume-contact,.body-unit,.entry-first-row > span,.entry-second-row"),
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
  assert.equal(await identity.locator(".resume-role").count(), 1, "inline intent appears exactly once");
  assert.equal(await identity.locator(".resume-contact .resume-role").count(), 0);
  assert.equal(
    await identity.evaluate((node) => {
      const name = node.querySelector(".resume-name")!.getBoundingClientRect();
      const role = node.querySelector(".identity-main > .resume-role")!.getBoundingClientRect();
      return name.top < role.bottom && role.top < name.bottom && role.left >= name.right;
    }),
    true,
    "inline header places job intent next to the name",
  );
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
  assert.equal(standard.inlineLink, true, "standard layout places links alongside the subtitle");
  assert.equal(standard.separateLinks, 0);
  assert.equal(standard.bulletPadding, "20px");
  assert.equal(standard.bulletSpacing, "6px");
  assert.equal(standard.date, "2024.01 - 至今");
  assert.match(standard.birthday!, /1999\.12/);
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
    "inline links remain alongside the subtitle when the secondary metadata slot is empty",
  );
  await update({ entry: { location: "广州" } });

  let combinations = 0;
  for (const template of templates)
    for (const entryPriority of ["time", "location"] as const) {
      for (const entryLayout of ["one", "two"] as const)
        for (const entryLinkLayout of ["inline", "separate"] as const) {
          for (const align of ["left", "center", "right"] as const) {
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
                entrySubtitleAlign:
                  entryPriority === "location" ? align : align === "left" ? "right" : "left",
                entryMetaAlign: align === "center" ? (entryPriority === "time" ? "left" : "right") : align,
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
            if (align === "center" && entryLayout === "two" && entryLinkLayout === "inline") {
              const offset = await entry.locator(".entry-inline-link").evaluate((link) => {
                const box = (link.closest(".entry-subtitle-link-group") || link).getBoundingClientRect();
                const row = link.closest(".entry-second-row")!.getBoundingClientRect();
                return Math.abs(box.left + box.width / 2 - row.left - row.width / 2);
              });
              assert.ok(offset < 2, `${template.id}: link must be centered against its complete row`);
            }
            assert.equal(
              await entry
                .locator(".entry-first-row strong")
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
                  ".entry-first-row > *, .entry-title-group > *, .entry-second-row > *, .entry-secondary-group > *, .entry-subtitle-link-group > *",
                ),
              ].filter((element) => element.getClientRects().length);
              const overlap = [
                ".entry-first-row",
                ".entry-title-group",
                ".entry-second-row",
                ".entry-secondary-group",
                ".entry-subtitle-link-group",
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
              // Preserved line-end spaces can hang outside a line box. Check
              // visible characters before reporting a text overflow.
              const textOverflow = children.flatMap((el) => {
                const range = document.createRange();
                range.selectNodeContents(el);
                const text = range.getBoundingClientRect();
                if (!text.width || (text.left >= bounds.left - 1 && text.right <= bounds.right + 1))
                  return [];
                const visibleOverflow: string[] = [];
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                while (walker.nextNode()) {
                  const node = walker.currentNode;
                  for (let i = 0; i < (node.textContent?.length || 0); i++) {
                    if (!node.textContent![i].trim()) continue;
                    range.setStart(node, i);
                    range.setEnd(node, i + 1);
                    const letter = range.getBoundingClientRect();
                    if (letter.left < bounds.left - 1 || letter.right > bounds.right + 1)
                      visibleOverflow.push(node.textContent![i]);
                  }
                }
                return visibleOverflow.length ? [{ field: el.className || el.tagName, visibleOverflow }] : [];
              });
              return {
                width: bounds.width,
                height: bounds.height,
                overlap,
                textOverflow,
                outside:
                  textOverflow.length > 0 ||
                  children.some((el) => {
                    const r = el.getBoundingClientRect();
                    return r.left < bounds.left - 1 || r.right > bounds.right + 1;
                  }),
              };
            });
            assert.equal(
              geometry.outside,
              false,
              `${template.id}/${entryPriority}/${entryLayout}/${entryLinkLayout}/${align}: field outside heading ${JSON.stringify(geometry.textOverflow)}`,
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
  let singleTitleCombinations = 0;
  for (const template of templates) {
    for (const align of ["left", "center", "right"] as const) {
      for (const metaAlign of ["left", "right"] as const) {
        let expected: number[] | undefined;
        for (const subtitleAlign of ["left", "center", "right"] as const) {
          await update({
            entry: { title: "山海", subtitle: "研发", location: "沪", url: "" },
            style: {
              ...STANDARD_STYLE,
              ...template.defaults,
              template: template.id,
              entryLayout: "one",
              entryTitleAlign: align,
              entrySubtitleAlign: subtitleAlign,
              entryMetaAlign: metaAlign,
            },
          });
          const row = page.locator(".paper-page .entry-first-row");
          const actual = await row.evaluate((node, metaAlign) => {
            const group = node.querySelector(".entry-title-group")!;
            const title = group.querySelector("strong")!.getBoundingClientRect();
            const subtitle = group.querySelector(".entry-inline-subtitle")!.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(group);
            const text = range.getBoundingClientRect();
            const bounds = group.getBoundingClientRect();
            const row = node.getBoundingClientRect();
            range.selectNodeContents(node.querySelector(".entry-date")!);
            const metadata = range.getBoundingClientRect();
            let expectedLeft = row.left + (row.width - text.width) / 2;
            if (metadata.width && metadata.top < text.bottom - 1) {
              expectedLeft =
                metaAlign === "left"
                  ? Math.max(expectedLeft, metadata.right + 8)
                  : Math.min(expectedLeft, metadata.left - 8 - text.width);
            }
            return {
              sameLine: Math.abs(title.top - subtitle.top) < 2,
              gap: subtitle.left - title.right,
              left: text.left - bounds.left,
              right: bounds.right - text.right,
              center: Math.abs(text.left - expectedLeft),
              positions: [title.left, title.top, subtitle.left, subtitle.top],
            };
          }, metaAlign);
          const name = `${template.id}/${align}/${metaAlign}/${subtitleAlign}`;
          assert.equal(actual.sameLine, true, `${name}: title and subtitle must share a line`);
          assert.ok(actual.gap >= 9 && actual.gap <= 11, `${name}: title and subtitle stay together`);
          assert.ok(actual[align] < 2, `${name}: align the whole pair`);
          if (expected)
            assert.deepEqual(actual.positions, expected, `${name}: subtitle alignment is ignored`);
          else expected = actual.positions;
          singleTitleCombinations++;
        }
      }
    }
  }
  console.log(
    `PASS ${singleTitleCombinations} single-line title pairs: one alignment and no independent subtitle movement`,
  );
  for (const title of ["粤税通小程序", "数据分析资源管控", "广东税务智能导办平台"]) {
    await update({
      entry: {
        title,
        subtitle: `${title === "粤税通小程序" ? "微信小程序开发" : "前端开发"} - 广东睿盟计算机科技有限公司`,
        start: "2022-06",
        end: "2023-07",
        location: "广州",
        url: "",
      },
      style: {
        ...STANDARD_STYLE,
        template: "classic",
        entryLayout: "one",
        entryTitleAlign: "center",
        entryMetaAlign: "right",
        dateFormat: "chinese",
      },
    });
    const geometry = await page.locator(".paper-page .entry-first-row").evaluate((node) => {
      const group = node.querySelector(".entry-title-group")!;
      const title = group.querySelector("strong")!.getBoundingClientRect();
      const subtitle = group.querySelector(".entry-inline-subtitle")!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(group);
      const text = range.getBoundingClientRect();
      const row = node.getBoundingClientRect();
      const dateNode = node.querySelector(".entry-date")!;
      const date = dateNode.getBoundingClientRect();
      const metadataText = document.createRange();
      metadataText.selectNodeContents(dateNode);
      const metadataBounds = metadataText.getBoundingClientRect();
      return {
        sameLine: Math.abs(title.top - subtitle.top) < 2,
        center: text.left + text.width / 2 - row.left - row.width / 2,
        expectedCenter:
          metadataBounds.top >= text.bottom - 1
            ? 0
            : Math.min(0, metadataBounds.left - 8 - text.width / 2 - row.left - row.width / 2),
        overlap: text.right > date.left + 1 && text.bottom > date.top + 1,
        metadataSingleLine: metadataBounds.height < parseFloat(getComputedStyle(dateNode).lineHeight) + 2,
      };
    });
    assert.equal(geometry.sameLine, true, `${title}: use available width before wrapping subtitle`);
    assert.ok(
      Math.abs(geometry.center - geometry.expectedCenter) < 2,
      `${title}: shift only as far as needed to clear metadata`,
    );
    assert.equal(geometry.overlap, false, `${title}: title pair must not overlap metadata`);
    assert.equal(
      geometry.metadataSingleLine,
      true,
      `${title}: keep complete Chinese dates and city together`,
    );
  }
  console.log("PASS centered long single-line title pairs use available row width");
  for (const metaAlign of ["left", "right"] as const) {
    for (const paper of ["a4", "letter"] as const) {
      for (const mode of ["centered", "shifted", "wrapped", "centered"] as const) {
        const title = mode === "centered" ? "山海" : "数据分析资源管控";
        const long = mode === "wrapped";
        await update({
          entry: {
            title,
            subtitle: long
              ? "前端开发 - 广东睿盟计算机科技有限公司及平台研发部门核心应用开发组"
              : mode === "shifted"
                ? "前端开发 - 山海科技有限公司应用平台"
                : "研发",
          },
          style: { paper, entryMetaAlign: metaAlign, fontSize: 14, entryTitleSize: 14 },
        });
        const heading = page.locator(".paper-page .entry-heading");
        assert.equal(
          await heading.getAttribute("data-metadata-row"),
          long ? "true" : null,
          `${paper}/${metaAlign}/${mode}: recompute metadata placement after content/paper changes`,
        );
        const geometry = await heading.evaluate((node) => {
          const row = node.querySelector(".entry-first-row")!.getBoundingClientRect();
          const metadata = node.querySelector(".entry-date")!;
          const range = document.createRange();
          range.selectNodeContents(metadata);
          const text = range.getBoundingClientRect();
          const titleNode = node.querySelector(".entry-title-group")!;
          range.selectNodeContents(titleNode);
          const title = range.getBoundingClientRect();
          const titleMain = titleNode.querySelector("strong")!.getBoundingClientRect();
          const subtitle = titleNode.querySelector(".entry-inline-subtitle")!.getBoundingClientRect();
          return {
            left: Math.abs(text.left - row.left),
            right: Math.abs(row.right - text.right),
            lines: text.height / parseFloat(getComputedStyle(metadata).lineHeight),
            separate: text.top >= title.bottom - 1,
            center: title.left + title.width / 2 - row.left - row.width / 2,
            gap: text.left > title.left ? text.left - title.right : title.left - text.right,
            titleSameLine: Math.abs(titleMain.top - subtitle.top) < 2,
          };
        });
        assert.ok(geometry[metaAlign] < 2, `${paper}/${metaAlign}: preserve metadata alignment`);
        assert.ok(geometry.lines < 1.1, `${paper}/${metaAlign}: do not squeeze Chinese dates or city`);
        assert.equal(geometry.separate, long, `${paper}/${metaAlign}: move metadata only when necessary`);
        assert.equal(geometry.titleSameLine, true, `${paper}/${metaAlign}/${mode}: keep title pair inline`);
        if (mode === "shifted") {
          assert.ok(
            (metaAlign === "left" ? geometry.center : -geometry.center) > 2,
            `${paper}/${metaAlign}: shift toward free space ${JSON.stringify(geometry)}`,
          );
          assert.ok(Math.abs(geometry.gap - 8) < 2, `${paper}/${metaAlign}: use the smallest shift`);
        } else assert.ok(Math.abs(geometry.center) < 2, `${paper}/${metaAlign}: retain page centering`);
        assert.equal(await page.locator(".paper-page .entry-width-probe").count(), 0);
      }
    }
  }
  console.log(
    "PASS metadata stays intact and aligned; row placement updates on A4/Letter and content changes",
  );
  let inlineCombinations = 0;
  for (const template of templates) {
    for (const subtitleAlign of ["left", "center", "right"] as const) {
      for (const linkAlign of ["left", "center", "right"] as const) {
        for (const metaAlign of ["left", "right"] as const) {
          await update({
            entry: { title: "开源项目", subtitle: "前端开发", location: "沪", url: "x.cn" },
            style: {
              ...STANDARD_STYLE,
              ...template.defaults,
              template: template.id,
              entrySubtitleAlign: subtitleAlign,
              entryLinkAlign: linkAlign,
              entryMetaAlign: metaAlign,
            },
          });
          const inline = page.locator(".paper-page .entry-second-row");
          const measure = await inline.evaluate((row) => {
            const subtitleRange = document.createRange();
            subtitleRange.selectNodeContents(row.querySelector(".entry-subtitle")!);
            const linkRange = document.createRange();
            linkRange.selectNodeContents(row.querySelector(".entry-inline-link")!);
            const subtitle = subtitleRange.getClientRects()[0];
            const link = linkRange.getClientRects()[0];
            const pair = row.querySelector(".entry-subtitle-link-group")?.getBoundingClientRect();
            const box = row.getBoundingClientRect();
            const midpoint = box.left + box.width / 2;
            return {
              sameLine: Math.abs(subtitle.top - link.top) < 1,
              paired: Boolean(pair),
              pairCenter: pair ? Math.abs(pair.left + pair.width / 2 - midpoint) : null,
              subtitleCenter: Math.abs(subtitle.left + subtitle.width / 2 - midpoint),
              linkCenter: Math.abs(link.left + link.width / 2 - midpoint),
            };
          });
          const name = `${template.id}/${subtitleAlign}/${linkAlign}/${metaAlign}`;
          assert.equal(measure.sameLine, true, `${name}: short subtitle and link must share a line`);
          assert.equal(
            measure.paired,
            subtitleAlign === linkAlign,
            `${name}: matching alignments form a pair`,
          );
          if (subtitleAlign === "center" && linkAlign === "center")
            assert.ok(measure.pairCenter! < 2, `${name}: center the pair as a whole`);
          else {
            if (subtitleAlign === "center") assert.ok(measure.subtitleCenter < 2, name);
            if (linkAlign === "center") assert.ok(measure.linkCenter < 2, name);
          }
          inlineCombinations++;
        }
      }
    }
  }
  console.log(
    `PASS ${inlineCombinations} short inline layouts: real shared line, paired and independent alignment`,
  );
  await mkdir("output/qa", { recursive: true });
  for (const entryTitleAlign of ["left", "center", "right"] as const) {
    await update({
      entry: { title: "山海科技", subtitle: "产品经理 · 用户增长", location: "上海", url: "" },
      style: { ...STANDARD_STYLE, entryLayout: "one", entryTitleAlign, entrySubtitleAlign: "right" },
    });
    await page.locator(".paper-page .entry-heading").screenshot({
      path: `output/qa/single-title-${entryTitleAlign}.png`,
    });
  }
  for (const entryLinkAlign of ["left", "center"] as const) {
    await update({
      entry: {
        title: "视频聊天室",
        subtitle: "开源项目 - 项目预览：rtcchatroom.cn",
        location: "",
        url: "github.com/example/rtc-chatroom",
      },
      style: { ...STANDARD_STYLE, entrySubtitleAlign: "center", entryLinkAlign },
    });
    await page.locator(".paper-page .entry-heading").screenshot({
      path: `output/qa/inline-centered-subtitle-${entryLinkAlign}.png`,
    });
  }
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
            const title = getComputedStyle(paper.querySelector(".section-heading")!);
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
  for (const template of templates) {
    for (const bulletStyle of ["auto", "disc", "circle", "square", "diamond"] as const) {
      for (const bodyAlign of ["left", "center", "right"] as const) {
        await update({
          entry: {
            description: "<ul><li>一级标记<ul><li>二级标记</li></ul></li></ul><ol><li>有序项目</li></ol>",
          },
          style: {
            ...STANDARD_STYLE,
            template: template.id,
            bulletStyle,
            bulletSize: 5,
            bodyAlign,
            headerSpacing: 35,
            headingGap: 19,
          },
        });
        const actual = await page
          .locator(".paper-page")
          .first()
          .evaluate((paper) => {
            const unordered = [...paper.querySelectorAll('.bullet-unit[data-list-kind="unordered"]')];
            return {
              markers: unordered.map((node) => {
                const css = getComputedStyle(node, "::before");
                return [css.content, css.width, css.height, css.backgroundColor, css.border, css.transform];
              }),
              ordered: getComputedStyle(
                paper.querySelector('.bullet-unit[data-list-kind="ordered"]')!,
                "::before",
              ).content,
              headerGap: getComputedStyle(paper.querySelector(".resume-identity")!).paddingBottom,
              headingGap: getComputedStyle(paper.querySelector(".section-heading")!).paddingBottom,
            };
          });
        const label = `${template.id}/${bulletStyle}/${bodyAlign}`;
        assert.equal(actual.markers.length, 2, label);
        assert.deepEqual(
          actual.markers[0],
          actual.markers[1],
          `${label}: nested marks retain selected shape`,
        );
        assert.equal(actual.markers[0][0], '""', `${label}: use geometry instead of a font glyph`);
        assert.equal(actual.markers[0][1], "5px", `${label}: obey marker size`);
        assert.equal(actual.markers[0][5] === "none", bulletStyle !== "diamond", label);
        assert.equal(actual.ordered, '"1."', `${label}: unordered style must not affect numbering`);
        assert.equal(actual.headerGap, "35px", `${label}: header gap applies to every template`);
        assert.equal(actual.headingGap, "19px", `${label}: module title gap applies to every template`);
        await page.emulateMedia({ media: "print" });
        const printedMarker = await page
          .locator('.paper-page .bullet-unit[data-list-kind="unordered"]')
          .first()
          .evaluate((node) => getComputedStyle(node, "::before").width);
        assert.equal(printedMarker, "5px", `${label}: print retains marker geometry`);
        await page.emulateMedia({ media: "screen" });
      }
      for (const skillStyle of ["icons", "tags"] as const) {
        await update({ style: { skillStyle } });
        assert.equal(await page.locator(".paper-page .kind-skills.bullet-unit").count(), 0);
        const content = await page
          .locator(".paper-page .kind-skills")
          .first()
          .evaluate((node) => getComputedStyle(node, "::before").content);
        assert.equal(content, skillStyle === "icons" ? '"◆"' : "none");
      }
    }
  }
  console.log("PASS 90 marker/layout combinations, nesting, ordered lists, skills, spacing and print parity");

  await update({ style: { ...STANDARD_STYLE, template: "classic", nameSize: 20, profileColor: "" } });
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
