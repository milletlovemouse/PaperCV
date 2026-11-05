import { SegmentedControl } from "@radix-ui/themes";
import { Check, CheckCheck } from "lucide-react";
import { type Resume } from "@resume/model";
import { getTemplate, templates, type TemplateCategory } from "@resume/templates";
import { TemplateThumbnail } from "@/features/preview/components/TemplateThumbnail";

import type { ResumeUpdater, StateSetter } from "../types";

interface Props {
  resume: Resume;
  update: ResumeUpdater;
  templateFilter: "all" | TemplateCategory;
  setTemplateFilter: StateSetter<"all" | TemplateCategory>;
}

export default function TemplatePanel({ resume, update, templateFilter, setTemplateFilter }: Props) {
  return (
    <div className="templates-panel">
      <p className="panel-description">六种结构，各有侧重。缩略图使用你的实际内容，切换后可继续调整排版。</p>
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
      <div className="template-gallery">
        {templates
          .filter((template) => templateFilter === "all" || template.category === templateFilter)
          .map((template) => (
            <button
              key={template.id}
              aria-label={`选择${template.name}模板`}
              aria-pressed={resume.style.template === template.id}
              className={`template-card ${resume.style.template === template.id ? "selected" : ""}`}
              onClick={() =>
                update(
                  (r) => ({ ...r, style: { ...r.style, ...template.defaults, template: template.id } }),
                  true,
                )
              }
            >
              <TemplateThumbnail resume={resume} template={template.id} />
              <div className="template-info">
                <div>
                  <strong>{template.name}</strong>
                  <span className="template-label">{template.label}</span>
                </div>
                <p>{template.description}</p>
              </div>
              <span className="template-check">
                {resume.style.template === template.id && <Check size={13} />}
              </span>
            </button>
          ))}
      </div>
      <div className="active-template-detail">
        <span>当前 · {getTemplate(resume.style.template).name}</span>
        <p>{getTemplate(resume.style.template).detail}</p>
      </div>
      <div className="soft-note">
        <CheckCheck size={16} />
        切换保留内容，并应用模板推荐间距
      </div>
    </div>
  );
}
