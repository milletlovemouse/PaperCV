import { useState } from "react";
import { normalizeResume, type Resume } from "@resume/model";
import { importPDF, type ImportResult } from "../lib/pdf-import";
import { printResume } from "@/features/preview/services/print-resume";

export function useResumeTransfer(resume: Resume, setToast: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importName, setImportName] = useState("");
  async function receiveFile(file: File) {
    setImportError("");
    setImporting(true);
    setImportResult(null);
    setImportName(file.name);
    try {
      if (/\.json$/i.test(file.name)) {
        if (file.size > 8_000_000) throw new Error("JSON 文件超过 8 MB");
        setImportResult({
          resume: normalizeResume(JSON.parse(await file.text())),
          mode: "editable",
          pages: 0,
          text: "",
        });
      } else if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
        setImportResult(await importPDF(file));
      } else throw new Error("请选择 PDF 或纸简 JSON 文件");
    } catch (error) {
      const message = error instanceof Error ? error.message : "文件读取失败";
      setImportError(/password/i.test(message) ? "该 PDF 已加密，请先解除密码保护后导入。" : message);
    } finally {
      setImporting(false);
    }
  }
  async function exportPDF() {
    setBusy(true);
    try {
      const result = await printResume(resume);
      setToast(
        result === "unavailable"
          ? "浏览器未响应打印，请从浏览器菜单选择“打印”（部分手机在“分享”中）；保存 PDF 时关闭页眉页脚以去掉网址"
          : "已请求打印：选择另存为 PDF，缩放 100%，关闭页眉页脚可去掉底部网址；完整恢复请另存 JSON 备份",
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "打印准备失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    importOpen,
    setImportOpen,
    importing,
    importError,
    setImportError,
    importResult,
    setImportResult,
    importName,
    receiveFile,
    exportPDF,
  };
}
