import { ArrowRight, Check, Maximize2, Plus, RotateCcw } from "lucide-react";
import { LAYOUT_DEFAULTS, PRESENTATION_DEFAULTS, type Resume } from "@resume/model";
import { ORIGINAL_PDF_STYLE, STANDARD_STYLE } from "@resume/templates";
import { Button, ChoiceGroup, ChoiceItem, Disclosure, LayoutOptions, SwitchField } from "@/shared/ui";
import EntryStyleSettings from "../components/style/EntryStyleSettings";
import IdentityStyleSettings from "../components/style/IdentityStyleSettings";
import ModuleStyleSettings from "../components/style/ModuleStyleSettings";
import { ChoiceChips } from "../components/style/StyleControls";
import TypographySettings from "../components/style/TypographySettings";
import { styleOptionValues } from "../components/style/style-option-values";

import type { ResumeUpdater } from "../types";

interface Props {
  resume: Resume;
  update: ResumeUpdater;
  fitOnePage: () => void;
}

export default function StylePanel({ resume, update, fitOnePage }: Props) {
  const choices = styleOptionValues(resume.style);
  const style = (key: keyof Resume["style"], value: string | number | boolean) =>
    update((r) => ({ ...r, style: { ...r.style, [key]: value } }));
  return (
    <div className="style-panel">
      <p className="panel-description">细微的调整，让每一页都清晰、舒展。</p>
      <div className="style-preset-actions">
        <Button
          className="button secondary"
          onClick={() => update((r) => ({ ...r, style: { ...r.style, ...STANDARD_STYLE } }), true)}
        >
          应用标准排版
        </Button>
        <Button
          className="button secondary"
          onClick={() => update((r) => ({ ...r, style: { ...r.style, ...ORIGINAL_PDF_STYLE } }), true)}
        >
          应用原稿 PDF 排版
        </Button>
        <Button
          className="button secondary style-reset-button"
          onClick={() =>
            update(
              (r) => ({ ...r, style: { ...r.style, ...LAYOUT_DEFAULTS, ...PRESENTATION_DEFAULTS } }),
              true,
            )
          }
        >
          <RotateCcw size={16} aria-hidden="true" />
          恢复模板默认
        </Button>
      </div>
      <p className="setting-note">标准排版参照网页预览；原稿 PDF 排版使用上传原稿的字号、留白与菱形列表。</p>
      <Disclosure className="style-details layout-controls" title="布局与对齐" defaultOpen>
        <LayoutOptions
          label="页眉布局"
          value={resume.style.headerLayout}
          displayValue={choices.headerLayout}
          options={[
            ["stacked", "上下排列"],
            ["split", "左右分列"],
            ["inline", "姓名横排"],
          ]}
          onChange={(value) => style("headerLayout", value)}
        />
        <LayoutOptions
          label="姓名与求职意向"
          value={resume.style.nameAlign}
          displayValue={choices.nameAlign}
          onChange={(value) => style("nameAlign", value)}
        />
        <LayoutOptions
          label="联系方式对齐"
          value={resume.style.contactAlign}
          displayValue={choices.contactAlign}
          onChange={(value) => style("contactAlign", value)}
        />
        <LayoutOptions
          label="模块标题对齐"
          value={resume.style.sectionAlign}
          displayValue={choices.sectionAlign}
          onChange={(value) => style("sectionAlign", value)}
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
        {resume.style.entryLayout === "one" ? (
          <p className="setting-note">单行标题中，主标题与副标题作为整体，统一使用主标题对齐方式。</p>
        ) : (
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
        )}
        <LayoutOptions
          label="正文对齐"
          value={resume.style.bodyAlign}
          displayValue={choices.bodyAlign}
          options={[
            ["left", "居左"],
            ["center", "居中"],
            ["right", "居右"],
            ["justify", "两端"],
          ]}
          onChange={(value) => style("bodyAlign", value)}
        />
        <p className="setting-note">对齐作用于所在栏，调整后会重新分页。</p>
      </Disclosure>
      <TypographySettings resume={resume} style={style} />
      <IdentityStyleSettings resume={resume} style={style} />
      <ModuleStyleSettings resume={resume} style={style} />
      <EntryStyleSettings resume={resume} style={style} />
      <Disclosure className="style-details style-appearance-group" title="颜色与纸张" defaultOpen>
        <h4>主题色</h4>
        <ChoiceGroup
          label="主题色"
          className="color-swatches"
          value={resume.style.accent}
          onChange={(value) => style("accent", value)}
        >
          {["#34584b", "#303b4e", "#272727", "#a65b41", "#776044", "#626c80"].map((color) => (
            <ChoiceItem key={color} value={color} asChild>
              <button
                aria-label={`主题色 ${color}`}
                style={{ background: color }}
                className={resume.style.accent === color ? "chosen" : ""}
              >
                {resume.style.accent === color && <Check size={16} />}
              </button>
            </ChoiceItem>
          ))}
          <label className="custom-color" title="自定义主题色">
            <Plus size={16} />
            <input
              aria-label="自定义主题色"
              type="color"
              value={resume.style.accent}
              onChange={(e) => style("accent", e.target.value)}
            />
          </label>
        </ChoiceGroup>
        <h4 className="appearance-subheading">纸张设置</h4>
        <ChoiceGroup
          label="纸张尺寸"
          className="paper-options"
          value={resume.style.paper}
          onChange={(value) => style("paper", value)}
        >
          {(["a4", "letter"] as const).map((paper) => (
            <ChoiceItem key={paper} value={paper} asChild>
              <button className={resume.style.paper === paper ? "chosen" : ""}>
                <span>{paper === "a4" ? "A4" : "Letter"}</span>
                <small>{paper === "a4" ? "210 × 297 mm" : "215.9 × 279.4 mm"}</small>
                {resume.style.paper === paper && <Check size={14} />}
              </button>
            </ChoiceItem>
          ))}
        </ChoiceGroup>
        <SwitchField
          label="显示页码"
          description="在每页底部显示「当前页 / 总页数」"
          checked={resume.style.showPageNumbers}
          onChange={(checked) => style("showPageNumbers", checked)}
        />
        <ChoiceChips
          label="纸张风格"
          value={resume.style.paperStyle}
          options={[
            ["plain", "普通"],
            ["frame", "规整边框"],
            ["rail", "侧边装饰"],
            ["soft", "清透底色"],
            ["corner", "个性角标"],
          ]}
          onChange={(value) => style("paperStyle", value)}
        />
      </Disclosure>
      <Button className="button fit-button" onClick={fitOnePage}>
        <Maximize2 size={16} />
        适配为一页
        <ArrowRight size={15} />
      </Button>
      <p className="setting-note">根据实际排版调整字号和行距，保持文字清晰可读。</p>
    </div>
  );
}
