import { Modal } from "@/shared/ui";

interface Props {
  onClose: () => void;
}

export default function HelpDialog({ onClose }: Props) {
  return (
    <Modal title="让简历创作，简单一点" subtitle="纸简 PaperCV · 使用指南" onClose={onClose}>
      <div className="help-content">
        <p>
          <strong>01 / 写下经历</strong>
          在内容面板填写信息、添加经历，支持加粗、列表等格式。右侧预览会立即更新。
        </p>
        <p>
          <strong>02 / 调整呈现</strong>
          选择模板、设置字体与间距。点击预览里的文字，可以快速回到对应的编辑位置。
        </p>
        <p>
          <strong>03 / 导出与继续</strong>通过浏览器打印窗口选择“另存为 PDF”，使用 100%
          缩放、关闭页眉页脚并开启背景图形。纸张选择与预览一致的 A4 或 Letter。打印 PDF
          可提取文字；完整保留编辑数据请导出 JSON 备份。
        </p>
        <p>
          <strong>关于保存</strong>内容自动保存在当前浏览器。清除浏览器数据后无法恢复，请定期导出 JSON
          备份。编辑、导入与打印均在浏览器本地完成，无需后端服务。旧版含附件的纸简 PDF 仍可完整恢复。
        </p>
      </div>
    </Modal>
  );
}
