import { ArrowRight, Download, FileDown, FileText } from "lucide-react";
import { printResume } from "@/features/preview/services/print-resume";
import { downloadBlob } from "@/shared/lib/download";
import { Modal } from "@/shared/ui";
import { sampleResume } from "../data/sample";

import type { Resume } from "@resume/model";
import type { Confirmation, ResumeUpdater, StateSetter } from "../types";

interface Props {
  resume: Resume;
  update: ResumeUpdater;
  setBackupOpen: StateSetter<boolean>;
  setConfirm: StateSetter<Confirmation | null>;
  setActive: StateSetter<string>;
  setToast: StateSetter<string>;
}

export default function BackupDialog({
  resume,
  update,
  setBackupOpen,
  setConfirm,
  setActive,
  setToast,
}: Props) {
  return (
    <Modal title="简历与备份" subtitle="把内容保存在自己手里。" onClose={() => setBackupOpen(false)}>
      <div className="action-list">
        <button
          onClick={() => {
            downloadBlob(
              new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" }),
              `${resume.title}.json`,
            );
            setBackupOpen(false);
            setToast("JSON 备份已下载");
          }}
        >
          <Download size={19} />
          <div>
            <strong>导出 JSON 备份</strong>
            <p>完整保留内容、模板与排版，可再次导入。</p>
          </div>
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => {
            setBackupOpen(false);
            setConfirm({
              title: "载入示例简历？",
              message: "当前内容将被替换，你可以通过撤销恢复。",
              action: () => {
                update(() => sampleResume(), true);
                setActive("profile");
              },
            });
          }}
        >
          <FileText size={19} />
          <div>
            <strong>载入示例简历</strong>
            <p>参考一份完整的产品经理简历。</p>
          </div>
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => {
            setBackupOpen(false);
            void printResume(resume).catch((error: unknown) =>
              setToast(error instanceof Error ? error.message : "打印准备失败，请重试"),
            );
          }}
        >
          <FileDown size={19} />
          <div>
            <strong>系统打印</strong>
            <p>通过浏览器打印，或另存为 PDF。</p>
          </div>
          <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}
