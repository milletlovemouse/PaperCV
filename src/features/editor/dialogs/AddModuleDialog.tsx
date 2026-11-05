import { Plus } from "lucide-react";
import { blankEntry, uid, MAX_SECTIONS, MAX_ENTRIES, type Resume, type Section } from "@resume/model";
import { Modal } from "@/shared/ui";
import { kinds, sectionIcons } from "../config/sections";

import type { ResumeUpdater, StateSetter } from "../types";

interface Props {
  resume: Resume;
  update: ResumeUpdater;
  setActive: StateSetter<string>;
  setAddOpen: StateSetter<boolean>;
}

export default function AddModuleDialog({ resume, update, setActive, setAddOpen }: Props) {
  const full =
    resume.sections.length >= MAX_SECTIONS ||
    resume.sections.reduce((count, section) => count + section.entries.length, 0) >= MAX_ENTRIES;
  return (
    <Modal title="添加简历模块" subtitle="挑选最能展现你的部分。" onClose={() => setAddOpen(false)}>
      <div className="module-picker">
        {kinds.map(([kind, title]) => {
          const Icon = sectionIcons[kind];
          return (
            <button
              key={kind}
              disabled={full}
              title={full ? `最多添加 ${MAX_SECTIONS} 个模块、${MAX_ENTRIES} 条经历` : undefined}
              onClick={() => {
                const section: Section = { id: uid(), title, kind, visible: true, entries: [blankEntry()] };
                update((r) => ({ ...r, sections: [...r.sections, section] }), true);
                setActive(section.id);
                setAddOpen(false);
                setTimeout(
                  () => document.getElementById(`edit-${section.id}`)?.scrollIntoView({ behavior: "smooth" }),
                  100,
                );
              }}
            >
              <Icon size={20} />
              <span>{title}</span>
              <Plus size={17} />
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
