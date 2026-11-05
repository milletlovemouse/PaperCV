import { DATE_FORMAT_OPTIONS } from "@resume/editor-config";
import { type Resume } from "@resume/model";
import { LayoutOptions, UISelect } from "@/shared/ui";

import type { StyleUpdater } from "../../types";

interface Props {
  resume: Resume;
  style: StyleUpdater;
}
export default function EntryStyleSettings({ resume, style }: Props) {
  return (
    <details className="style-details" open>
      <summary>经历标题与日期</summary>
      <label className="field date-format-setting">
        <span>日期显示格式</span>
        <UISelect
          label="日期显示格式"
          value={resume.style.dateFormat}
          onChange={(value) => style("dateFormat", value)}
          options={DATE_FORMAT_OPTIONS}
        />
      </label>
      <p className="setting-note">
        模板默认按模板显示经历日期；自定义格式同时用于经历日期和生日，不改变已保存的日期。
      </p>
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
        label="经历主标题对齐"
        value={resume.style.entryTitleAlign || "left"}
        options={[
          ["left", "居左"],
          ["center", "居中"],
          ["right", "居右"],
        ]}
        onChange={(value) => style("entryTitleAlign", value)}
      />
      <LayoutOptions
        label="经历副标题对齐"
        value={resume.style.entrySubtitleAlign || "left"}
        options={[
          ["left", "居左"],
          ["center", "居中"],
          ["right", "居右"],
        ]}
        onChange={(value) => style("entrySubtitleAlign", value)}
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
        value={resume.style.entryLinkLayout || "auto"}
        options={[
          ["auto", "自动"],
          ["inline", "副标题同行"],
          ["separate", "单独一行"],
        ]}
        onChange={(value) => style("entryLinkLayout", value)}
      />
      <LayoutOptions
        label="相关链接对齐"
        value={resume.style.entryLinkAlign || "auto"}
        options={[
          ["auto", "自动"],
          ["left", "居左"],
          ["right", "居右"],
        ]}
        onChange={(value) => style("entryLinkAlign", value)}
      />
      <p className="setting-note">
        自动模式会在时间或地点占用副标题行时，将链接独立放在下方左侧。同行布局放不下时自动换行；单行标题下的链接始终独立成行。
      </p>
    </details>
  );
}
