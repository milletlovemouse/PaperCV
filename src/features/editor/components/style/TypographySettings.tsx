import { MIN_PAGE_MARGIN, type Resume } from "@resume/model";
import { Button, Range, UISelect } from "@/shared/ui";

import type { StyleUpdater } from "../../types";

interface Props {
  resume: Resume;
  style: StyleUpdater;
}
export default function TypographySettings({ resume, style }: Props) {
  return (
    <div className="style-group">
      <h3>文字与间距</h3>
      <label className="field">
        <span>正文字体</span>
        <UISelect
          label="正文字体"
          value={resume.style.font}
          onChange={(value) => style("font", value)}
          options={[
            ["yahei", "微软雅黑（未安装时使用思源黑体）"],
            ["sans", "思源黑体 · Noto Sans SC"],
            ["serif", "思源宋体 · Noto Serif SC"],
          ]}
        />
      </label>
      <Range
        label="字号"
        value={resume.style.fontSize}
        min={10}
        max={16}
        step={0.5}
        unit="px"
        onChange={(v) => style("fontSize", v)}
      />
      <Range
        label="行距"
        value={resume.style.lineHeight}
        min={1.25}
        max={2.1}
        step={0.05}
        onChange={(v) => style("lineHeight", v)}
      />
      <Range
        label="页边距"
        value={resume.style.margin}
        min={MIN_PAGE_MARGIN}
        max={25}
        step={1}
        unit="mm"
        onChange={(v) => style("margin", v)}
      />
      <div className="margin-actions">
        <Button variant="surface" onClick={() => style("margin", 8)}>
          小留白（8 mm）
        </Button>
        <p>手机保存 PDF 白边偏大时可减小页边距。浏览器自身的打印边距仍由系统控制。</p>
      </div>
      <Range
        label="模块间距"
        value={resume.style.moduleSpacing}
        min={5}
        max={30}
        step={1}
        unit="px"
        onChange={(v) => style("moduleSpacing", v)}
      />
      <Range
        label="经历间距"
        value={resume.style.entrySpacing}
        min={0}
        max={22}
        step={1}
        unit="px"
        onChange={(v) => style("entrySpacing", v)}
      />
      {resume.style.template === "classic" && (
        <>
          <Range
            label="个人信息下方留白"
            value={resume.style.headerSpacing ?? 27}
            min={0}
            max={50}
            step={1}
            unit="px"
            onChange={(v) => style("headerSpacing", v)}
          />
          <Range
            label="模块标题下方留白"
            value={resume.style.headingGap ?? 10}
            min={0}
            max={25}
            step={1}
            unit="px"
            onChange={(v) => style("headingGap", v)}
          />
        </>
      )}
    </div>
  );
}
