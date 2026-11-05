import { isTextSection } from "@resume/editor-config";
import DateField from "@/shared/ui/DateField";
import { Checkbox, Field, SelectField } from "@/shared/ui";
import RichText from "@/features/rich-text/components/RichText";

import type { Entry, Section } from "@resume/model";
import type { EntryUpdater } from "../types";
interface Props {
  section: Section;
  entry: Entry;
  entryUpdate: EntryUpdater;
}
export default function EntryForm({ section, entry, entryUpdate }: Props) {
  return (
    <>
      {!isTextSection(section.kind) && (
        <div className="field-grid">
          <Field
            label={
              section.kind === "education"
                ? "学校名称"
                : section.kind === "work"
                  ? "公司名称"
                  : "项目 / 经历名称"
            }
            wide
            value={entry.title}
            onChange={(v) => entryUpdate(section.id, entry.id, "title", v)}
          />
          <Field
            label={section.kind === "education" ? "专业" : "职位 / 角色"}
            wide
            value={entry.subtitle}
            onChange={(v) => entryUpdate(section.id, entry.id, "subtitle", v)}
          />
          {section.kind === "education" ? (
            <>
              <SelectField
                label="学历"
                value={entry.degree || ""}
                options={["博士", "硕士", "本科", "大专", "高中", "中专", "其他"]}
                onChange={(v) => entryUpdate(section.id, entry.id, "degree", v)}
              />
              <SelectField
                label="培养方式"
                value={entry.educationType || ""}
                options={["全日制", "非全日制", "在职"]}
                onChange={(v) => entryUpdate(section.id, entry.id, "educationType", v)}
              />
              <Field
                label="学院 / 院系"
                value={entry.college || ""}
                onChange={(v) => entryUpdate(section.id, entry.id, "college", v)}
              />
              <Field
                label="学校标签"
                placeholder="985、211、双一流"
                value={entry.schoolTags || ""}
                onChange={(v) => entryUpdate(section.id, entry.id, "schoolTags", v)}
              />
            </>
          ) : (
            <Field
              label="所在部门"
              wide
              value={entry.department || ""}
              onChange={(v) => entryUpdate(section.id, entry.id, "department", v)}
            />
          )}
          <div className="date-range-fields">
            <div className="field-grid">
              <DateField
                label="开始时间"
                value={entry.start}
                onChange={(v) => entryUpdate(section.id, entry.id, "start", v)}
              />
              <DateField
                label="结束时间"
                value={entry.end}
                disabled={entry.end === "至今"}
                onChange={(v) => entryUpdate(section.id, entry.id, "end", v)}
              />
            </div>
            <label className="inline-checkbox">
              <Checkbox
                checked={entry.end === "至今"}
                onCheckedChange={(checked) =>
                  entryUpdate(section.id, entry.id, "end", checked === true ? "至今" : "")
                }
              />
              {section.kind === "education" ? "目前在读" : "至今"}
            </label>
          </div>
          <Field
            label="所在城市"
            wide
            value={entry.location}
            onChange={(v) => entryUpdate(section.id, entry.id, "location", v)}
          />
          <Field
            label={section.kind === "portfolio" ? "作品链接" : "相关链接"}
            placeholder="https://..."
            wide
            value={entry.url || ""}
            onChange={(v) => entryUpdate(section.id, entry.id, "url", v)}
          />
        </div>
      )}
      <RichText
        label={
          isTextSection(section.kind)
            ? section.kind === "skills"
              ? "技能与优势"
              : section.title
            : "经历描述"
        }
        value={entry.description}
        onChange={(v) => entryUpdate(section.id, entry.id, "description", v)}
      />
    </>
  );
}
