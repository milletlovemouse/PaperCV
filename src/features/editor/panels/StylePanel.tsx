import { ArrowRight, Check, Maximize2, Plus } from "lucide-react";
import { LAYOUT_DEFAULTS, PRESENTATION_DEFAULTS, type Resume } from "@resume/model";
import { ORIGINAL_PDF_STYLE, STANDARD_STYLE } from "@resume/templates";
import { Button, Checkbox, LayoutOptions } from "@/shared/ui";
import EntryStyleSettings from "../components/style/EntryStyleSettings";
import IdentityStyleSettings from "../components/style/IdentityStyleSettings";
import ModuleStyleSettings from "../components/style/ModuleStyleSettings";
import { ChoiceChips } from "../components/style/StyleControls";
import TypographySettings from "../components/style/TypographySettings";

import type { ResumeUpdater } from "../types";

interface Props {
  resume: Resume;
  update: ResumeUpdater;
  fitOnePage: () => void;
}

export default function StylePanel({ resume, update, fitOnePage }: Props) {
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
      </div>
      <p className="setting-note">标准排版参照网页预览；原稿 PDF 排版使用上传原稿的字号、留白与菱形列表。</p>
      <div className="style-group layout-controls">
        <h3>
          布局样式
          <button
            className="layout-reset"
            onClick={() =>
              update(
                (r) => ({ ...r, style: { ...r.style, ...LAYOUT_DEFAULTS, ...PRESENTATION_DEFAULTS } }),
                true,
              )
            }
          >
            恢复模板默认
          </button>
        </h3>
        <LayoutOptions
          label="页眉布局"
          value={resume.style.headerLayout}
          options={[
            ["auto", "默认"],
            ["stacked", "上下排列"],
            ["split", "左右分列"],
            ["inline", "姓名横排"],
          ]}
          onChange={(value) => style("headerLayout", value)}
        />
        <LayoutOptions
          label="姓名与求职意向"
          value={resume.style.nameAlign}
          onChange={(value) => style("nameAlign", value)}
        />
        <LayoutOptions
          label="联系方式对齐"
          value={resume.style.contactAlign}
          onChange={(value) => style("contactAlign", value)}
        />
        <LayoutOptions
          label="模块标题对齐"
          value={resume.style.sectionAlign}
          onChange={(value) => style("sectionAlign", value)}
        />
        <LayoutOptions
          label="正文对齐"
          value={resume.style.bodyAlign}
          options={[
            ["auto", "默认"],
            ["left", "居左"],
            ["center", "居中"],
            ["right", "居右"],
            ["justify", "两端"],
          ]}
          onChange={(value) => style("bodyAlign", value)}
        />
        <LayoutOptions
          label="标题样式"
          value={resume.style.headingStyle}
          options={[
            ["auto", "默认"],
            ["line", "下划线"],
            ["tint", "色块"],
            ["plain", "纯文字"],
          ]}
          onChange={(value) => style("headingStyle", value)}
        />
        <p className="setting-note">默认跟随当前模板。对齐作用于所在栏，调整后会重新分页。</p>
      </div>
      <EntryStyleSettings resume={resume} style={style} />
      <IdentityStyleSettings resume={resume} style={style} />
      <ModuleStyleSettings resume={resume} style={style} />
      <TypographySettings resume={resume} style={style} />
      <div className="style-group">
        <h3>主题色</h3>
        <div className="color-swatches">
          {["#34584b", "#303b4e", "#272727", "#a65b41", "#776044", "#626c80"].map((color) => (
            <button
              key={color}
              aria-label={`主题色 ${color}`}
              style={{ background: color }}
              className={resume.style.accent === color ? "chosen" : ""}
              onClick={() => style("accent", color)}
            >
              {resume.style.accent === color && <Check size={16} />}
            </button>
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
        </div>
      </div>
      <div className="style-group">
        <h3>纸张设置</h3>
        <div className="paper-options">
          {(["a4", "letter"] as const).map((paper) => (
            <button
              key={paper}
              className={resume.style.paper === paper ? "chosen" : ""}
              onClick={() => style("paper", paper)}
            >
              <span>{paper === "a4" ? "A4" : "Letter"}</span>
              <small>{paper === "a4" ? "210 × 297 mm" : "215.9 × 279.4 mm"}</small>
              {resume.style.paper === paper && <Check size={14} />}
            </button>
          ))}
        </div>
      </div>
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
      <label className="inline-checkbox">
        <Checkbox
          checked={resume.style.showPageNumbers}
          onCheckedChange={(checked) => style("showPageNumbers", checked === true)}
        />
        显示页码
      </label>
      <Button className="button fit-button" onClick={fitOnePage}>
        <Maximize2 size={16} />
        适配为一页
        <ArrowRight size={15} />
      </Button>
      <p className="setting-note">根据实际排版调整字号和行距，保持文字清晰可读。</p>
    </div>
  );
}
