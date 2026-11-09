import { PRESENTATION_DEFAULTS, type Resume } from "@resume/model";
import { Disclosure, Range } from "@/shared/ui";

import type { StyleUpdater } from "../../types";
import { ChoiceChips, ColorSetting } from "./StyleControls";
import { styleOptionValues } from "./style-option-values";

interface Props {
  resume: Resume;
  style: StyleUpdater;
}
export default function ModuleStyleSettings({ resume, style }: Props) {
  const choices = styleOptionValues(resume.style);
  return (
    <Disclosure className="style-details" title="模块与列表" defaultOpen>
      <ChoiceChips
        label="模块标题样式"
        value={resume.style.headingStyle}
        displayValue={choices.headingStyle}
        options={[
          ["line", "下划线"],
          ["tint", "色块"],
          ["plain", "纯文字"],
          ["solid", "突出"],
          ["double", "双线"],
          ["dotted", "虚线"],
          ["bracket", "规整"],
          ["pill", "圆角"],
          ["flag", "箭头"],
          ["side", "左侧线"],
          ["table", "表格"],
        ]}
        onChange={(value) => style("headingStyle", value)}
      />
      <ColorSetting
        label="模块标题颜色"
        value={resume.style.titleColor}
        fallback={resume.style.accent}
        onChange={(value) => style("titleColor", value)}
      />
      <Range
        label="分割线粗细"
        value={resume.style.dividerWidth ?? PRESENTATION_DEFAULTS.dividerWidth}
        min={0}
        max={4}
        step={0.25}
        unit="px"
        onChange={(v) => style("dividerWidth", v)}
      />
      <ChoiceChips
        label="无序列表标记"
        value={resume.style.bulletStyle}
        displayValue={choices.bulletStyle}
        options={[
          ["disc", "实心圆"],
          ["circle", "空心圆"],
          ["square", "方形"],
          ["diamond", "菱形"],
        ]}
        onChange={(value) => style("bulletStyle", value)}
      />
      <Range
        label="列表标记大小"
        value={resume.style.bulletSize ?? PRESENTATION_DEFAULTS.bulletSize}
        min={2}
        max={8}
        step={0.25}
        unit="px"
        onChange={(v) => style("bulletSize", v)}
      />
      <ChoiceChips
        label="技能样式"
        value={resume.style.skillStyle}
        options={[
          ["text", "文字"],
          ["icons", "图标"],
          ["tags", "标签"],
        ]}
        onChange={(value) => style("skillStyle", value)}
      />
    </Disclosure>
  );
}
