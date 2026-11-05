import { ArrowDown, ArrowUp, Eye, EyeOff, Plus } from "lucide-react";
import { Button, IconButton, Modal, TextField } from "@/shared/ui";

import type { Resume } from "@resume/model";
import type { SectionUpdater, StateSetter } from "../types";

interface Props {
  resume: Resume;
  sectionUpdate: SectionUpdater;
  moveSection: (id: string, direction: number) => void;
  setManageOpen: StateSetter<boolean>;
  setAddOpen: StateSetter<boolean>;
}

export default function ManageModulesDialog({
  resume,
  sectionUpdate,
  moveSection,
  setManageOpen,
  setAddOpen,
}: Props) {
  return (
    <Modal
      title="模块管理"
      subtitle="修改模块名称、顺序与显示状态，预览会同步更新。"
      onClose={() => setManageOpen(false)}
      footer={
        <>
          <Button
            className="button secondary"
            onClick={() => {
              setManageOpen(false);
              setAddOpen(true);
            }}
          >
            <Plus size={15} />
            添加模块
          </Button>
          <Button variant="solid" className="button primary" onClick={() => setManageOpen(false)}>
            完成
          </Button>
        </>
      }
    >
      {resume.sections.map((section, index) => (
        <div className="manage-module-row" key={section.id}>
          <TextField.Root
            aria-label={`模块名称 ${index + 1}`}
            value={section.title}
            onChange={(e) => sectionUpdate(section.id, (s) => ({ ...s, title: e.target.value }))}
          />
          <IconButton
            title={`上移 ${section.title}`}
            disabled={index === 0}
            onClick={() => moveSection(section.id, -1)}
          >
            <ArrowUp size={15} />
          </IconButton>
          <IconButton
            title={`下移 ${section.title}`}
            disabled={index === resume.sections.length - 1}
            onClick={() => moveSection(section.id, 1)}
          >
            <ArrowDown size={15} />
          </IconButton>
          <IconButton
            title={`${section.visible ? "隐藏" : "显示"} ${section.title}`}
            onClick={() => sectionUpdate(section.id, (s) => ({ ...s, visible: !s.visible }), true)}
          >
            {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </IconButton>
        </div>
      ))}
    </Modal>
  );
}
