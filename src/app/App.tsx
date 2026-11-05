import { Theme } from "@radix-ui/themes";
import { CheckCheck, PanelLeftClose, X } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { blankResume } from "@resume/model";
import type { TemplateCategory } from "@resume/templates";
import EditorHeader from "@/features/editor/components/EditorHeader";
import EditorNavigation from "@/features/editor/components/EditorNavigation";
import AddModuleDialog from "@/features/editor/dialogs/AddModuleDialog";
import BackupDialog from "@/features/editor/dialogs/BackupDialog";
import HelpDialog from "@/features/editor/dialogs/HelpDialog";
import ManageModulesDialog from "@/features/editor/dialogs/ManageModulesDialog";
import { useResumeActions } from "@/features/editor/hooks/useResumeActions";
import { useResumeHistory } from "@/features/editor/hooks/useResumeHistory";
import { useResumePersistence } from "@/features/editor/hooks/useResumePersistence";
import { loadResume } from "@/features/editor/lib/storage";
import ContentPanel from "@/features/editor/panels/ContentPanel";
import StylePanel from "@/features/editor/panels/StylePanel";
import TemplatePanel from "@/features/editor/panels/TemplatePanel";
import type { Confirmation, EditorTab } from "@/features/editor/types";
import ImportDialog from "@/features/import/components/ImportDialog";
import { useResumeTransfer } from "@/features/import/hooks/useResumeTransfer";
import PreviewPanel from "@/features/preview/components/PreviewPanel";
import { useFitOnePage } from "@/features/preview/hooks/useFitOnePage";
import { usePreviewLayout } from "@/features/preview/hooks/usePreviewLayout";
import { useTheme } from "@/shared/hooks/useTheme";
import { Button, IconButton, Modal } from "@/shared/ui";

export default function App() {
  const { theme, setTheme } = useTheme();
  const { resume, update, undo, redo, canUndo, canRedo } = useResumeHistory(loadResume);
  const [tab, setTab] = useState<EditorTab>("content");
  const [templateFilter, setTemplateFilter] = useState<"all" | TemplateCategory>("all");
  const [active, setActive] = useState("profile");
  const [pages, setPages] = useState(1);
  const { zoom, setZoom, previewOnly, setPreviewOnly, previewRef } = usePreviewLayout(resume.style.paper);
  const saveState = useResumePersistence(resume);
  const [toast, setToast] = useState("");
  const {
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
  } = useResumeTransfer(resume, setToast);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const editing = (event.target as HTMLElement).closest("input,textarea,[contenteditable]");
      if (event.key.toLowerCase() === "z" && !editing) {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        setToast("简历会自动保存在当前浏览器，可通过更多菜单导出 JSON 备份");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);
  useEffect(() => {
    if (selectedEntry)
      document
        .getElementById(`edit-${selectedEntry}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedEntry, active, tab]);

  const { profile, sectionUpdate, entryUpdate, moveSection, moveEntry } = useResumeActions(update);
  const selectPreview = useCallback((sectionId: string, entryId?: string) => {
    setTab("content");
    setPreviewOnly(false);
    setActive(sectionId);
    setSelectedEntry(entryId || "profile");
    setTimeout(
      () =>
        document
          .getElementById(`edit-${entryId || sectionId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      120,
    );
  }, []);

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    let bitmap: ImageBitmap | undefined;
    try {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8_000_000) {
        setToast("请选择 8 MB 以内的 PNG、JPG 或 WebP 图片");
        return;
      }
      bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = 280;
      canvas.height = 350;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("无法创建图片画布");
      const scale = Math.max(280 / bitmap.width, 350 / bitmap.height);
      context.drawImage(
        bitmap,
        (280 - bitmap.width * scale) / 2,
        (350 - bitmap.height * scale) / 2,
        bitmap.width * scale,
        bitmap.height * scale,
      );
      profile("avatar", canvas.toDataURL("image/jpeg", 0.85));
    } catch {
      setToast("照片读取失败，请选择有效的 PNG、JPG 或 WebP 图片重试");
    } finally {
      bitmap?.close();
      input.value = "";
    }
  }
  const fitOnePage = useFitOnePage(resume, pages, update, setToast);

  const visibleSections = resume.sections.filter((s) => s.visible).length;
  const wordCount = [
    resume.profile.summary,
    ...resume.sections
      .filter((s) => s.visible)
      .flatMap((s) =>
        s.entries.filter((e) => e.visible !== false).map((e) => e.description.replace(/<[^>]+>/g, "")),
      ),
  ].join("").length;
  const completeness = Math.round(
    ([
      resume.profile.name,
      resume.profile.role,
      resume.profile.email,
      resume.profile.phone,
      resume.sections.some((s) => s.entries.some((e) => e.title || e.description)),
    ].filter(Boolean).length /
      5) *
      100,
  );
  const closeImport = () => {
    if (!importing) setImportOpen(false);
  };

  return (
    <Theme
      appearance={theme}
      accentColor="gray"
      grayColor="gray"
      radius="medium"
      scaling="100%"
      panelBackground="solid"
      className="editor-theme"
    >
      <div className={`app-shell ${previewOnly ? "preview-only" : ""}`}>
        <EditorHeader
          title={resume.title}
          onTitleChange={(title) => update((r) => ({ ...r, title }))}
          saveState={saveState}
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          onBackup={() => setBackupOpen(true)}
          onImport={() => {
            setImportOpen(true);
            setImportResult(null);
            setImportError("");
          }}
          onExport={exportPDF}
          busy={busy}
        />
        <EditorNavigation
          tab={tab}
          previewOnly={previewOnly}
          onTabChange={(value) => {
            setTab(value);
            setPreviewOnly(false);
          }}
          onNew={() =>
            setConfirm({
              title: "创建新简历",
              message: "当前简历会保留在撤销历史中。建议先导出 PDF 或 JSON 备份，再开始新简历。",
              action: () => {
                update(() => blankResume(), true);
                setActive("profile");
                setTab("content");
              },
            })
          }
          onHelp={() => setHelpOpen(true)}
        />
        <aside className="editor-panel" inert={previewOnly} aria-hidden={previewOnly}>
          <div className="panel-heading">
            <div>
              <div className="eyebrow">MAKE YOUR NEXT MOVE</div>
              <h1>
                {tab === "content"
                  ? "每一段经历，都值得被看见"
                  : tab === "templates"
                    ? "为你的经历，找到合适的样子"
                    : "让好内容，呈现得恰到好处"}
              </h1>
            </div>
            <IconButton title="收起编辑面板" onClick={() => setPreviewOnly(true)}>
              <PanelLeftClose size={17} />
            </IconButton>
          </div>
          {tab === "content" && (
            <ContentPanel
              resume={resume}
              update={update}
              active={active}
              setActive={setActive}
              completeness={completeness}
              profile={profile}
              uploadAvatar={uploadAvatar}
              sectionUpdate={sectionUpdate}
              entryUpdate={entryUpdate}
              moveSection={moveSection}
              moveEntry={moveEntry}
              setConfirm={setConfirm}
              setSelectedEntry={setSelectedEntry}
              setAddOpen={setAddOpen}
              setManageOpen={setManageOpen}
            />
          )}
          {tab === "templates" && (
            <TemplatePanel
              resume={resume}
              update={update}
              templateFilter={templateFilter}
              setTemplateFilter={setTemplateFilter}
            />
          )}
          {tab === "style" && <StylePanel resume={resume} update={update} fitOnePage={fitOnePage} />}
        </aside>
        <PreviewPanel
          resume={resume}
          previewRef={previewRef}
          previewOnly={previewOnly}
          setPreviewOnly={setPreviewOnly}
          pages={pages}
          zoom={zoom}
          setZoom={setZoom}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          selectPreview={selectPreview}
          setPages={setPages}
          visibleSections={visibleSections}
          wordCount={wordCount}
        />
        {toast && (
          <div className="toast" role="status">
            <CheckCheck size={17} />
            {toast}
            <button aria-label="关闭提示" onClick={() => setToast("")}>
              <X size={14} />
            </button>
          </div>
        )}
        {importOpen && (
          <ImportDialog
            importing={importing}
            importResult={importResult}
            importError={importError}
            importName={importName}
            receiveFile={receiveFile}
            onClose={closeImport}
            onConfirm={() => {
              if (!importResult) return;
              update(() => importResult.resume, true);
              setImportOpen(false);
              setTab("content");
              setActive("profile");
              setToast(
                importResult.mode === "editable"
                  ? "简历已完整恢复，可以继续编辑"
                  : "简历已按模块和经历导入，请核对识别结果",
              );
            }}
          />
        )}
        {addOpen && (
          <AddModuleDialog resume={resume} update={update} setActive={setActive} setAddOpen={setAddOpen} />
        )}
        {manageOpen && (
          <ManageModulesDialog
            resume={resume}
            sectionUpdate={sectionUpdate}
            moveSection={moveSection}
            setManageOpen={setManageOpen}
            setAddOpen={setAddOpen}
          />
        )}
        {confirm && (
          <Modal
            title={confirm.title}
            onClose={() => setConfirm(null)}
            footer={
              <>
                <Button className="button secondary" onClick={() => setConfirm(null)}>
                  取消
                </Button>
                <Button
                  className="button primary"
                  onClick={() => {
                    confirm.action();
                    setConfirm(null);
                  }}
                >
                  确认
                </Button>
              </>
            }
          >
            <p className="confirm-message">{confirm.message}</p>
          </Modal>
        )}
        {backupOpen && (
          <BackupDialog
            resume={resume}
            update={update}
            setBackupOpen={setBackupOpen}
            setConfirm={setConfirm}
            setActive={setActive}
            setToast={setToast}
          />
        )}
        {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      </div>
    </Theme>
  );
}
