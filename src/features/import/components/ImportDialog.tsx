import { ArrowRight, Check, FileDown, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import { Button, Disclosure, Modal } from "@/shared/ui";
import { type ImportResult } from "../lib/pdf-import";

interface Props {
  importing: boolean;
  importResult: ImportResult | null;
  importError: string;
  importName: string;
  receiveFile: (file: File) => Promise<void>;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ImportDialog({
  importing,
  importResult,
  importError,
  importName,
  receiveFile,
  onClose,
  onConfirm,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Modal
      title="把你的经历，带进来"
      subtitle="导入 PDF 或 JSON，接着写下一步。"
      onClose={onClose}
      wide
      busy={importing}
      footer={
        <>
          <Button className="button secondary" onClick={onClose} disabled={importing}>
            取消
          </Button>
          <Button
            variant="solid"
            className="button primary"
            disabled={!importResult || importing}
            onClick={onConfirm}
          >
            确认导入
            <ArrowRight size={15} />
          </Button>
        </>
      }
    >
      <input
        ref={fileRef}
        className="visually-hidden"
        type="file"
        accept=".pdf,.json,application/pdf,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) receiveFile(file);
          e.target.value = "";
        }}
      />
      <button
        className={`dropzone ${importing ? "loading" : ""}`}
        disabled={importing}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && !importing) receiveFile(file);
        }}
      >
        <span className="dropzone-icon">
          {importing ? <LoaderCircle className="spin" size={28} /> : <FileDown size={28} strokeWidth={1.5} />}
        </span>
        <strong>
          {importing ? "正在读取简历…" : importResult ? importName : "点击选择，或将文件拖到这里"}
        </strong>
        <span>支持 PDF（20 MB 以内）和纸简 JSON</span>
        <span className="button secondary small">{importResult ? "重新选择文件" : "选择文件"}</span>
      </button>
      {importError && (
        <div className="import-error" role="alert">
          {importError}
        </div>
      )}
      {importResult && (
        <div className="import-result">
          <div className="import-result-head">
            <span className="success-icon">
              <Check size={17} />
            </span>
            <div>
              <strong>
                {importResult.mode === "editable" ? "已找到完整的可编辑数据" : "已识别模块、经历与段落"}
              </strong>
              <p>
                {importResult.mode === "editable"
                  ? "将恢复内容、模板与排版设置。"
                  : "已根据文字位置整理经历、日期和列表，并恢复基础排版；字体、装饰和分页可能与原稿不同，请核对识别结果。"}{" "}
              </p>
            </div>
          </div>
          <div className="import-summary">
            <span>
              姓名<strong>{importResult.resume.profile.name || "待填写"}</strong>
            </span>
            <span>
              内容模块
              <strong>
                {importResult.resume.sections.length} 个 /{" "}
                {importResult.resume.sections.reduce((sum, section) => sum + section.entries.length, 0)}{" "}
                条内容
              </strong>
            </span>
            <span>
              文件页数<strong>{importResult.pages || "—"}</strong>
            </span>
          </div>
          {importResult.text && (
            <Disclosure className="import-text-details" title="查看提取文字">
              <pre>{importResult.text}</pre>
            </Disclosure>
          )}
        </div>
      )}
      <div className="import-notes">
        <p>
          <ShieldCheck size={14} />
          导入解析在当前浏览器完成。
        </p>
        <p>
          JSON 备份和旧版含数据附件的 PDF 支持完整恢复；浏览器打印 PDF 支持文字提取；扫描件需先做
          OCR。确认导入会替换当前内容，可通过撤销恢复。
        </p>
      </div>
    </Modal>
  );
}
