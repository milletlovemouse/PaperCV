import { MIN_PAGE_MARGIN, type Resume } from "@resume/model";
import { Disclosure, Range, UISelect } from "@/shared/ui";

import type { StyleUpdater } from "../../types";

interface Props {
  resume: Resume;
  style: StyleUpdater;
}
export default function TypographySettings({ resume, style }: Props) {
  return (
    <>
      <Disclosure className="style-details typography-settings" title="字体与字号" defaultOpen>
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
        <div className="setting-subgroup">
          <p className="setting-note">正文包含基本信息、时间地点、职位角色、链接和经历描述。</p>
          <Range
            label="正文字体大小"
            value={resume.style.fontSize}
            min={10}
            max={16}
            step={0.5}
            unit="px"
            ariaLabel="字号"
            onChange={(v) => style("fontSize", v)}
          />
          <Range
            label="姓名字体大小"
            value={resume.style.nameSize}
            min={20}
            max={40}
            step={1}
            unit="px"
            onChange={(v) => style("nameSize", v)}
          />
          <Range
            label="模块名称字体大小"
            value={resume.style.sectionSize}
            min={9}
            max={24}
            step={0.5}
            unit="px"
            onChange={(v) => style("sectionSize", v)}
          />
          <Range
            label="标题字体大小"
            value={resume.style.entryTitleSize}
            min={9}
            max={24}
            step={0.5}
            unit="px"
            onChange={(v) => style("entryTitleSize", v)}
          />
        </div>
      </Disclosure>
      <Disclosure className="style-details spacing-settings" title="边距与间距" defaultOpen>
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
      </Disclosure>
    </>
  );
}
