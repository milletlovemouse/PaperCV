import { ArrowLeft, Check, Maximize2, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import { Button, IconButton } from "@/shared/ui";
import ResumePreview from "./ResumePreview";

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Resume } from "@resume/model";

interface Props {
  resume: Resume;
  previewRef: RefObject<HTMLDivElement | null>;
  previewOnly: boolean;
  setPreviewOnly: Dispatch<SetStateAction<boolean>>;
  pages: number;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectPreview: (sectionId: string, entryId?: string) => void;
  setPages: (count: number) => void;
  visibleSections: number;
  wordCount: number;
}

export default function PreviewPanel({
  resume,
  previewRef,
  previewOnly,
  setPreviewOnly,
  pages,
  zoom,
  setZoom,
  undo,
  redo,
  canUndo,
  canRedo,
  selectPreview,
  setPages,
  visibleSections,
  wordCount,
}: Props) {
  return (
    <main className="preview-panel" ref={previewRef}>
      <div className="preview-toolbar">
        <div className="preview-title">
          {previewOnly && (
            <Button className="restore-editor button secondary" onClick={() => setPreviewOnly(false)}>
              <ArrowLeft size={15} />
              返回编辑
            </Button>
          )}
          <span className="live-dot" />
          实时预览<span className="preview-separator">/</span>
          <span className="page-count">{pages} 页</span>
        </div>
        <div className="preview-tools">
          <IconButton title="撤销" onClick={undo} disabled={!canUndo}>
            <Undo2 size={16} />
          </IconButton>
          <IconButton title="重做" onClick={redo} disabled={!canRedo}>
            <Redo2 size={16} />
          </IconButton>
          <span className="toolbar-divider" />
          <IconButton
            title="缩小"
            onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
          >
            <Minus size={16} />
          </IconButton>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <IconButton
            title="放大"
            onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
          >
            <Plus size={16} />
          </IconButton>
          <span className="toolbar-divider" />
          <IconButton title={previewOnly ? "恢复编辑" : "专注预览"} onClick={() => setPreviewOnly((p) => !p)}>
            <Maximize2 size={16} />
          </IconButton>
        </div>
      </div>
      <div className="preview-scroll">
        <ResumePreview resume={resume} zoom={zoom} onSelect={selectPreview} onPages={setPages} />
      </div>
      <footer className="preview-footer">
        <span>
          <Check size={13} />
          点击预览中的文字，快速定位编辑
        </span>
        <span>
          {visibleSections} 个模块<span className="footer-dot">·</span>约 {wordCount} 字
          <span className="footer-dot">·</span>
          {resume.style.paper.toUpperCase()}
        </span>
      </footer>
    </main>
  );
}
