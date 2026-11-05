import {
  Download,
  FileText,
  LoaderCircle,
  Moon,
  MoreHorizontal,
  PencilLine,
  Sun,
  Upload,
} from "lucide-react";
import { Button, IconButton, TextField } from "@/shared/ui";

interface Props {
  title: string;
  onTitleChange: (title: string) => void;
  saveState: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onBackup: () => void;
  onImport: () => void;
  onExport: () => void;
  busy: boolean;
}

export default function EditorHeader({
  title,
  onTitleChange,
  saveState,
  theme,
  onToggleTheme,
  onBackup,
  onImport,
  onExport,
  busy,
}: Props) {
  return (
    <header className="topbar">
      <a href={import.meta.env.BASE_URL} className="brand" aria-label="纸简首页">
        <span className="brand-icon">
          <FileText size={22} strokeWidth={1.6} />
        </span>
        <span>
          纸简<span className="brand-en">PAPER CV</span>
        </span>
      </a>
      <div className="document-name">
        <TextField.Root
          variant="soft"
          aria-label="简历名称"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <PencilLine size={13} />
        <span className="save-indicator">
          <span className={saveState.includes("失败") ? "error-dot" : ""} />
          {saveState}
        </span>
      </div>
      <div className="header-actions">
        <div className="header-utilities">
          <Button
            className="button secondary theme-toggle"
            aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "浅色" : "深色"}</span>
          </Button>
          <IconButton title="更多操作" onClick={onBackup}>
            <MoreHorizontal size={20} />
          </IconButton>
        </div>
        <div className="header-file-actions">
          <Button
            className="button secondary import-button"
            aria-label="导入简历"
            title="导入简历"
            onClick={onImport}
          >
            <Upload size={16} />
            <span>导入简历</span>
          </Button>
          <Button
            variant="solid"
            className="button primary export-button"
            title="通过浏览器打印另存为 PDF；建议使用 Chrome / Edge，完整编辑数据请另存 JSON 备份"
            onClick={onExport}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}
            {busy ? "准备打印…" : "导出 PDF"}
          </Button>
        </div>
      </div>
    </header>
  );
}
