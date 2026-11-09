import { DATE_FORMAT_OPTIONS } from "@resume/editor-config";
import { type Resume } from "@resume/model";
import { Disclosure, LayoutOptions, UISelect } from "@/shared/ui";

import type { StyleUpdater } from "../../types";
import { styleOptionValues } from "./style-option-values";

interface Props {
  resume: Resume;
  style: StyleUpdater;
}
export default function EntryStyleSettings({ resume, style }: Props) {
  const choices = styleOptionValues(resume.style);
  return (
    <Disclosure className="style-details" title="经历与日期" defaultOpen>
      <label className="field date-format-setting">
        <span>日期显示格式</span>
        <UISelect
          label="日期显示格式"
          value={resume.style.dateFormat}
          displayValue={choices.dateFormat}
          onChange={(value) => style("dateFormat", value)}
          options={DATE_FORMAT_OPTIONS.filter(([value]) => value !== "template")}
        />
      </label>
      <p className="setting-note">日期格式同时用于经历日期和生日，不改变已保存的日期。</p>
      <LayoutOptions
        label="经历标题"
        value={resume.style.entryLayout}
        options={[
          ["two", "双行标题"],
          ["one", "单行标题"],
        ]}
        onChange={(value) => style("entryLayout", value)}
      />
      <LayoutOptions
        label="信息优先级"
        value={resume.style.entryPriority}
        options={[
          ["time", "时间优先"],
          ["location", "地点优先"],
        ]}
        onChange={(value) => style("entryPriority", value)}
      />
      <LayoutOptions
        label="标题分隔符"
        value={resume.style.entrySeparator}
        options={[
          ["dot", "圆点"],
          ["bar", "竖线"],
          ["none", "无符号"],
        ]}
        onChange={(value) => style("entrySeparator", value)}
      />
      <LayoutOptions
        label="时间与地点对齐"
        value={resume.style.entryMetaAlign || "right"}
        options={[
          ["left", "靠左排列"],
          ["right", "靠右排列"],
        ]}
        onChange={(value) => style("entryMetaAlign", value)}
      />
      <LayoutOptions
        label="相关链接位置"
        value={resume.style.entryLinkLayout || "inline"}
        options={[
          ["inline", "副标题同行"],
          ["separate", "单独一行"],
        ]}
        onChange={(value) => style("entryLinkLayout", value)}
      />
      <LayoutOptions
        label="相关链接对齐"
        value={resume.style.entryLinkAlign || "right"}
        options={[
          ["left", "居左"],
          ["center", "居中"],
          ["right", "居右"],
        ]}
        onChange={(value) => style("entryLinkAlign", value)}
      />
      <p className="setting-note">同行布局放不下时会换行；单行标题下的链接始终独立成行。</p>
    </Disclosure>
  );
}
