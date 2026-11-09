import { type Resume } from "@resume/model";
import { Disclosure, LayoutOptions } from "@/shared/ui";

import type { StyleUpdater } from "../../types";
import { ChoiceChips, ColorSetting } from "./StyleControls";
import { styleOptionValues } from "./style-option-values";

interface Props {
  resume: Resume;
  style: StyleUpdater;
}
export default function IdentityStyleSettings({ resume, style }: Props) {
  const choices = styleOptionValues(resume.style);
  return (
    <Disclosure className="style-details" title="页眉与基本信息" defaultOpen>
      <ChoiceChips
        label="头部风格"
        value={resume.style.headerDecoration}
        displayValue={choices.headerDecoration}
        options={[
          ["plain", "简约"],
          ["rule", "商务横线"],
          ["banner", "突出色块"],
          ["card", "卡片"],
          ["side", "专业侧线"],
          ["circle", "圆弧"],
        ]}
        onChange={(value) => style("headerDecoration", value)}
      />
      <ChoiceChips
        label="基本信息样式"
        value={resume.style.infoStyle}
        displayValue={choices.infoStyle}
        options={[
          ["simple", "简洁"],
          ["labels", "文字"],
          ["icons", "图标"],
          ["dots", "圆点"],
          ["outline", "线框"],
          ["tags", "标签"],
        ]}
        onChange={(value) => style("infoStyle", value)}
      />
      <LayoutOptions
        label="照片形状"
        value={resume.style.photoShape}
        options={[
          ["rect", "方形"],
          ["round", "圆角"],
          ["circle", "圆形"],
        ]}
        onChange={(value) => style("photoShape", value)}
      />
      <ColorSetting
        label="个人信息颜色"
        value={resume.style.profileColor}
        fallback={resume.style.accent}
        onChange={(value) => style("profileColor", value)}
      />
      <ColorSetting
        label="头部装饰颜色"
        value={resume.style.decorationColor}
        fallback={resume.style.accent}
        onChange={(value) => style("decorationColor", value)}
      />
    </Disclosure>
  );
}
