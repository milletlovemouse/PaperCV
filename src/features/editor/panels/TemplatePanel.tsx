import { SegmentedControl } from "@radix-ui/themes";
import { Check, CheckCheck } from "lucide-react";
import { type Resume } from "@resume/model";
import { getTemplate, type TemplateCategory } from "@resume/templates";
import { applyTemplatePreset, getSelectedTemplatePreset, templatePresets } from "@resume/template-presets";
import { ChoiceGroup, ChoiceItem } from "@/shared/ui";
import { TemplateThumbnail } from "@/features/preview/components/TemplateThumbnail";

import type { ResumeUpdater, StateSetter } from "../types";

interface Props {
  resume: Resume;
  update: ResumeUpdater;
  templateFilter: "all" | TemplateCategory;
  setTemplateFilter: StateSetter<"all" | TemplateCategory>;
}

export default function TemplatePanel({ resume, update, templateFilter, setTemplateFilter }: Props) {
  const selected = getSelectedTemplatePreset(resume.style);
  return (
    <div className="templates-panel">
      <p className="panel-description">
        {templatePresets.length} 套模板，各有侧重。缩略图使用你的实际内容，选择后可继续调整排版。
      </p>
      <SegmentedControl.Root
        className="template-filters"
        aria-label="模板布局筛选"
        value={templateFilter}
        onValueChange={(value) => setTemplateFilter(value as typeof templateFilter)}
      >
        {(
          [
            ["all", "全部"],
            ["single", "单栏"],
            ["columns", "双栏"],
            ["compact", "紧凑"],
          ] as const
        ).map(([key, label]) => (
          <SegmentedControl.Item key={key} value={key}>
            {label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      <ChoiceGroup
        label="简历模板"
        className="template-gallery"
        value={selected?.id || ""}
        onChange={(id) => update((r) => ({ ...r, style: applyTemplatePreset(r.style, id) }), true)}
      >
        {templatePresets
          .filter((template) => templateFilter === "all" || template.category === templateFilter)
          .map((template) => (
            <ChoiceItem key={template.id} value={template.id} asChild>
              <button
                aria-label={`选择${template.name}模板`}
                className={`template-card ${selected?.id === template.id ? "selected" : ""}`}
              >
                <TemplateThumbnail resume={resume} preset={template} />
                <div className="template-info">
                  <div>
                    <strong>{template.name}</strong>
                    <span className="template-label">{template.label}</span>
                  </div>
                  <p>{template.description}</p>
                </div>
                <span className="template-check">{selected?.id === template.id && <Check size={13} />}</span>
              </button>
            </ChoiceItem>
          ))}
      </ChoiceGroup>
      <div className="active-template-detail">
        <span>当前 · {selected?.name || `${getTemplate(resume.style.template).name} · 已自定义`}</span>
        <p>
          {selected?.detail ||
            "当前排版已自定义。选择模板会应用对应的字体、颜色、页眉和间距，可通过撤销恢复。"}
        </p>
      </div>
      <div className="soft-note">
        <CheckCheck size={16} />
        保留简历内容、纸张尺寸和页码设置，应用整套排版
      </div>
    </div>
  );
}
