import { Accordion } from "radix-ui";
import { Progress } from "@radix-ui/themes";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  ListFilter,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type ChangeEvent } from "react";
import { sortEntriesByDate } from "@resume/editor-config";
import { blankEntry, uid, MAX_SECTIONS, MAX_ENTRIES, type Resume } from "@resume/model";
import { IconButton, TextField } from "@/shared/ui";
import EntryForm from "../components/EntryForm";
import ProfileForm from "../components/ProfileForm";

import { sectionIcons } from "../config/sections";
import type { Confirmation, EntryUpdater, ResumeUpdater, SectionUpdater, StateSetter } from "../types";
interface Props {
  resume: Resume;
  update: ResumeUpdater;
  active: string;
  setActive: StateSetter<string>;
  completeness: number;
  profile: (key: keyof Resume["profile"], value: string) => void;
  uploadAvatar: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  sectionUpdate: SectionUpdater;
  entryUpdate: EntryUpdater;
  moveSection: (id: string, direction: number) => void;
  moveEntry: (sectionId: string, index: number, direction: number) => void;
  setConfirm: StateSetter<Confirmation | null>;
  setSelectedEntry: StateSetter<string>;
  setAddOpen: StateSetter<boolean>;
  setManageOpen: StateSetter<boolean>;
}

export default function ContentPanel({
  resume,
  update,
  active,
  setActive,
  completeness,
  profile,
  uploadAvatar,
  sectionUpdate,
  entryUpdate,
  moveSection,
  moveEntry,
  setConfirm,
  setSelectedEntry,
  setAddOpen,
  setManageOpen,
}: Props) {
  const entriesFull =
    resume.sections.reduce((count, section) => count + section.entries.length, 0) >= MAX_ENTRIES;
  const modulesFull = resume.sections.length >= MAX_SECTIONS || entriesFull;
  return (
    <>
      <button className="module-manage-trigger" onClick={() => setManageOpen(true)}>
        <ListFilter size={15} />
        模块管理 · 排序与显示
      </button>
      <div className="completion-card">
        <div className="completion-icon">
          <Sparkles size={18} />
        </div>
        <div className="completion-copy">
          <div>
            把下一步，写进简历<span>{completeness}%</span>
          </div>
          <Progress aria-label="简历完成度" className="progress-track" value={completeness} size="1" />
        </div>
      </div>
      <div className="panel-section-label">
        简历内容 <span>{resume.sections.length + 1} 个模块</span>
      </div>
      <Accordion.Root
        type="single"
        collapsible
        value={active}
        onValueChange={setActive}
        className="module-list"
      >
        <Accordion.Item value="profile" asChild>
          <section className={`module-card ${active === "profile" ? "expanded" : ""}`} id="edit-profile">
            <Accordion.Header className="module-accordion-heading">
              <Accordion.Trigger className="module-header">
                <span className="module-icon">
                  <FileText size={17} />
                </span>
                <span>基本信息</span>
                <span className="module-subtitle">让对方认识你</span>
                {active === "profile" ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Accordion.Trigger>
            </Accordion.Header>
            {active === "profile" && (
              <Accordion.Content className="module-body">
                <ProfileForm resume={resume} profile={profile} uploadAvatar={uploadAvatar} />
              </Accordion.Content>
            )}
          </section>
        </Accordion.Item>
        {resume.sections.map((section, sectionIndex) => {
          const Icon = sectionIcons[section.kind];
          return (
            <Accordion.Item key={section.id} value={section.id} asChild>
              <section
                className={`module-card ${active === section.id ? "expanded" : ""} ${!section.visible ? "module-hidden" : ""}`}
                key={section.id}
                id={`edit-${section.id}`}
              >
                <Accordion.Header className="module-accordion-heading module-editable-heading">
                  <span className="module-icon">
                    <Icon size={17} />
                  </span>
                  <div className="module-header-actions">
                    <TextField.Root
                      aria-label="模块名称"
                      value={section.title}
                      onChange={(e) => sectionUpdate(section.id, (s) => ({ ...s, title: e.target.value }))}
                    />
                    <span className="module-count">
                      {section.entries.length} 段{!section.visible && " · 已隐藏"}
                    </span>
                    <IconButton
                      title="经历按时间倒序"
                      disabled={section.entries.length < 2}
                      onClick={() =>
                        sectionUpdate(
                          section.id,
                          (s) => ({ ...s, entries: sortEntriesByDate(s.entries) }),
                          true,
                        )
                      }
                    >
                      <ListFilter size={14} />
                    </IconButton>
                    <IconButton
                      title="上移模块"
                      disabled={sectionIndex === 0}
                      onClick={() => moveSection(section.id, -1)}
                    >
                      <ArrowUp size={14} />
                    </IconButton>
                    <IconButton
                      title="下移模块"
                      disabled={sectionIndex === resume.sections.length - 1}
                      onClick={() => moveSection(section.id, 1)}
                    >
                      <ArrowDown size={14} />
                    </IconButton>
                    <IconButton
                      title={section.visible ? "隐藏模块" : "显示模块"}
                      onClick={() => sectionUpdate(section.id, (s) => ({ ...s, visible: !s.visible }), true)}
                    >
                      {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </IconButton>
                    <IconButton
                      title="删除模块"
                      onClick={() =>
                        setConfirm({
                          title: `删除「${section.title}」？`,
                          message: "这个模块及其中的经历将被移除，你可以通过撤销恢复。",
                          action: () =>
                            update(
                              (r) => ({ ...r, sections: r.sections.filter((s) => s.id !== section.id) }),
                              true,
                            ),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                  <Accordion.Trigger className="module-header" aria-label={`展开或收起${section.title}`}>
                    {active === section.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </Accordion.Trigger>
                </Accordion.Header>
                {active === section.id && (
                  <Accordion.Content className="module-body">
                    {section.entries.map((entry, entryIndex) => (
                      <div
                        className={`entry-form ${entry.visible === false ? "entry-hidden" : ""}`}
                        id={`edit-${entry.id}`}
                        key={entry.id}
                      >
                        <div className="entry-form-header">
                          <span>
                            <i />
                            {entry.title ||
                              `第 ${entryIndex + 1} 段${section.kind === "skills" ? "内容" : "经历"}`}
                          </span>
                          <div>
                            <IconButton
                              title="上移经历"
                              disabled={entryIndex === 0}
                              onClick={() => moveEntry(section.id, entryIndex, -1)}
                            >
                              <ArrowUp size={13} />
                            </IconButton>
                            <IconButton
                              title="下移经历"
                              disabled={entryIndex === section.entries.length - 1}
                              onClick={() => moveEntry(section.id, entryIndex, 1)}
                            >
                              <ArrowDown size={13} />
                            </IconButton>
                            <IconButton
                              title={entriesFull ? `最多添加 ${MAX_ENTRIES} 条经历` : "复制经历"}
                              disabled={entriesFull}
                              onClick={() =>
                                sectionUpdate(
                                  section.id,
                                  (s) => {
                                    const entries = [...s.entries];
                                    entries.splice(entryIndex + 1, 0, { ...entry, id: uid() });
                                    return { ...s, entries };
                                  },
                                  true,
                                )
                              }
                            >
                              <Copy size={13} />
                            </IconButton>
                            <IconButton
                              title={entry.visible === false ? "显示经历" : "隐藏经历"}
                              onClick={() =>
                                sectionUpdate(
                                  section.id,
                                  (s) => ({
                                    ...s,
                                    entries: s.entries.map((e) =>
                                      e.id === entry.id ? { ...e, visible: e.visible === false } : e,
                                    ),
                                  }),
                                  true,
                                )
                              }
                            >
                              {entry.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}
                            </IconButton>
                            <IconButton
                              title="删除经历"
                              onClick={() =>
                                setConfirm({
                                  title: "删除这段经历？",
                                  message: "删除后可以通过撤销恢复。",
                                  action: () =>
                                    sectionUpdate(
                                      section.id,
                                      (s) => ({ ...s, entries: s.entries.filter((e) => e.id !== entry.id) }),
                                      true,
                                    ),
                                })
                              }
                            >
                              <Trash2 size={13} />
                            </IconButton>
                          </div>
                        </div>
                        <EntryForm section={section} entry={entry} entryUpdate={entryUpdate} />
                      </div>
                    ))}
                    <button
                      className="add-entry"
                      disabled={entriesFull}
                      title={entriesFull ? `最多添加 ${MAX_ENTRIES} 条经历` : undefined}
                      onClick={() => {
                        const entry = blankEntry();
                        sectionUpdate(section.id, (s) => ({ ...s, entries: [...s.entries, entry] }), true);
                        setSelectedEntry(entry.id);
                      }}
                    >
                      <Plus size={15} />
                      添加{section.kind === "skills" ? "内容" : "一段经历"}
                    </button>
                  </Accordion.Content>
                )}
              </section>
            </Accordion.Item>
          );
        })}
        <button
          className="add-module"
          disabled={modulesFull}
          title={modulesFull ? `最多添加 ${MAX_SECTIONS} 个模块、${MAX_ENTRIES} 条经历` : undefined}
          onClick={() => setAddOpen(true)}
        >
          <Plus size={17} />
          添加简历模块<span>补充更多闪光点</span>
        </button>
      </Accordion.Root>
      <div className="panel-footnote">
        <ShieldCheck size={14} />
        内容自动保存到当前浏览器
      </div>
    </>
  );
}
