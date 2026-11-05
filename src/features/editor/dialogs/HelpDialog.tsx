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
          手机若未弹出打印窗口，请使用浏览器菜单中的“打印”（部分浏览器在“分享”中）。
        </p>
        <p>
          <strong>关于文件名与网址</strong>
          导出打印时会临时将页面标题设为左上角简历名称，浏览器可将其作为建议文件名；打印结束或取消后恢复网站标题。网址、日期等系统页眉页脚由浏览器添加，
          请在打印选项中关闭（若浏览器提供该选项）。iPhone / iPad 的 Safari 可能仍会添加，网页无法强制移除。
          如果手机保存后白边偏大，可在“排版 → 文字与间距”使用“小留白（8 mm）”，或将页边距调至 6–10 mm；
          预览会同步更新。系统额外添加的边距和缩放仍需通过浏览器打印选项调整。
        </p>
        <p>
          <strong>关于保存</strong>内容自动保存在当前浏览器。清除浏览器数据后无法恢复，请定期导出 JSON
          备份。编辑、导入与打印均在浏览器本地完成，无需后端服务。旧版含附件的纸简 PDF 仍可完整恢复。
        </p>
      </div>
    </Modal>
  );
}
