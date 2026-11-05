import assert from "node:assert/strict";
import test from "node:test";
import {
  extractPDFLines,
  parseResumeLayout,
  type PDFTextPage,
  type PDFTextRun,
} from "../../src/features/import/lib/import-layout";
import { identifyHeading } from "../../src/features/import/lib/import-text";

const run = (text: string, x: number, y: number, width = text.length * 7, size = 8): PDFTextRun => ({
  text,
  x,
  y,
  width,
  size,
});
const page = (...items: PDFTextRun[]): PDFTextPage => ({ width: 595, height: 842, items });

test("ordinary PDF ignores tiny edge identifiers and reads contact fields before role", () => {
  const { resume, text } = parseResumeLayout([
    page(
      run("DOCUMENT_TRACKER", 584, 1, 10, 1),
      run("林小雨", 35, 47, 42, 14),
      run("13800138000 丨 lin@example.com 丨 杭州", 35, 66, 280),
      run("github.com/example", 35, 80),
      run("1998-06 丨 女 丨 汉族 丨 群众", 35, 94),
      run("前端研发工程师", 35, 108),
      run("专业技能", 35, 144, 40, 10),
      run("熟练使用 TypeScript", 49, 167),
    ),
  ]);
  assert.equal(resume.profile.name, "林小雨");
  assert.equal(resume.profile.role, "前端研发工程师");
  assert.equal(resume.profile.location, "杭州");
  assert.equal(resume.profile.birthday, "1998-06");
  assert.equal(resume.profile.gender, "女");
  assert.equal(resume.profile.website, "github.com/example");
  assert.equal(resume.profile.summary, "");
  assert.ok(!text.includes("DOCUMENT_TRACKER"));
  assert.equal(resume.style.nameAlign, "left");
  assert.equal(resume.style.fontSize, 10.7);
});

test("dated entries keep dates, department and location apart from descriptions", () => {
  assert.equal(identifyHeading("工作与实习经历"), "work");
  const { resume } = parseResumeLayout([
    page(
      run("林小雨", 35, 47, 42, 14),
      run("工作与实习经历", 35, 140, 80, 10),
      run("示例科技", 35, 165),
      run("2021.03 - 2023.07", 483, 165, 77),
      run("前端工程师 技术部", 35, 184),
      run("杭州", 544, 184, 16),
      run("负责基础组件", 49, 203),
      run("另一家公司", 35, 230),
      run("2020.01 - 2021.02", 483, 230, 77),
      run("软件工程师", 35, 249),
      run("上海", 544, 249, 16),
      run("项目交付", 49, 268),
    ),
  ]);
  const entries = resume.sections[0].entries;
  assert.equal(entries.length, 2);
  assert.equal(entries[0].title, "示例科技");
  assert.equal(entries[0].start, "2021-03");
  assert.equal(entries[0].end, "2023-07");
  assert.equal(entries[0].subtitle, "前端工程师");
  assert.equal(entries[0].department, "技术部");
  assert.equal(entries[0].location, "杭州");
  assert.equal(entries[0].description, "<ul><li>负责基础组件</li></ul>");
});

test("cross-page entry headings, wrapped paragraphs and nested lists are reconstructed", () => {
  const { resume } = parseResumeLayout([
    page(run("项目经历", 35, 140, 40, 10), run("示例平台", 35, 806), run("2022.06 - 2023.07", 483, 806, 77)),
    page(
      run("前端开发", 35, 48),
      run("杭州", 544, 48, 16),
      run("项目描述：第一行文字", 49, 67, 510),
      run("第二行文字", 49, 81),
      run("个人职责：", 49, 100),
      run("封装可复用组件", 63, 114),
      run("处理包含多行的复杂业务与接口", 63, 133, 495),
      run("保持续行内容完整", 63, 147),
      run("技术栈：React", 49, 170),
      run("另一个项目", 35, 198),
      run("2023.08 - 至今", 483, 198, 77),
      run("独立开发", 35, 217),
      run("github.com/example/demo", 380, 217, 180),
      run("支持 <script> 安全显示", 49, 236),
    ),
  ]);
  const entries = resume.sections[0].entries;
  assert.equal(entries.length, 2);
  assert.equal(entries[0].subtitle, "前端开发");
  assert.equal(
    entries[0].description,
    "<ul><li>项目描述：第一行文字第二行文字</li><li>个人职责：<ul><li>封装可复用组件</li><li>处理包含多行的复杂业务与接口保持续行内容完整</li></ul></li><li>技术栈：React</li></ul>",
  );
  assert.equal(entries[1].url, "github.com/example/demo");
  assert.equal(entries[1].subtitle, "独立开发");
  assert.match(entries[1].description, /&lt;script&gt;/);
});

test("education fields and short independent bullets survive page continuations", () => {
  const { resume } = parseResumeLayout([
    page(
      run("项目经历", 35, 140, 40, 10),
      run("示例项目", 35, 165),
      run("2022.06 - 2023.07", 483, 165, 77),
      run("独立开发", 35, 184),
      run("个人职责：", 49, 782),
      run("实现数据缓存", 63, 801),
    ),
    page(
      run("实现数据图表", 63, 44),
      run("教育经历", 35, 100, 40, 10),
      run("示例职业学院", 35, 125),
      run("2018.09 - 2021.06", 483, 125, 77),
      run("软件技术 大专 信息学院", 35, 144),
      run("杭州", 544, 144, 16),
    ),
  ]);
  assert.match(resume.sections[0].entries[0].description, /实现数据缓存<\/li><li>实现数据图表/);
  const education = resume.sections[1].entries[0];
  assert.equal(education.subtitle, "软件技术");
  assert.equal(education.degree, "大专");
  assert.equal(education.college, "信息学院");
  assert.equal(education.location, "杭州");
});

test("text items with slight baseline differences join, normal small text is retained", () => {
  const lines = extractPDFLines([
    page(
      run("姓名", 35, 47, 20),
      run("测试", 56, 47.5, 20),
      run("小字正文", 35, 100, 30, 6),
      run("1 / 2", 280, 828, 30),
    ),
  ]);
  assert.equal(lines[0].text, "姓名测试");
  assert.equal(lines[1].text, "小字正文");
  assert.equal(lines.length, 2);
});
