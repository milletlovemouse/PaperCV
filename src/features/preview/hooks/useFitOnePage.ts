import type { Resume, ResumeUpdater } from "@resume/model";
import { paginate } from "../lib/paginate";
import { paperSize, verticalPageMargin } from "../lib/paper";

export function useFitOnePage(
  resume: Resume,
  pages: number,
  update: ResumeUpdater,
  setToast: (message: string) => void,
) {
  function fitOnePage() {
    if (pages === 1) {
      setToast("当前简历已经是一页");
      return;
    }
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".measure-shell [data-measure-column]"));
    if (!nodes.length) return;
    const oldStyles = nodes.map((node) => node.getAttribute("style"));
    let best: { fontSize: number; lineHeight: number } | undefined;
    try {
      const height =
        ((paperSize(resume.style.paper).height - verticalPageMargin(resume.style) * 2) * 96) / 25.4;
      for (let fontSize = resume.style.fontSize; fontSize >= 10 && !best; fontSize -= 0.5) {
        for (let lineHeight = resume.style.lineHeight; lineHeight >= 1.25; lineHeight -= 0.05) {
          nodes.forEach((node) => {
            node.style.setProperty("--resume-font-size", `${fontSize}px`);
            node.style.setProperty("--resume-line-height", lineHeight.toFixed(2));
          });
          if (nodes.every((node) => paginate(node, height).length === 1)) {
            best = { fontSize, lineHeight: Number(lineHeight.toFixed(2)) };
            break;
          }
        }
      }
    } finally {
      nodes.forEach((node, index) => {
        if (oldStyles[index] === null) node.removeAttribute("style");
        else node.setAttribute("style", oldStyles[index]!);
      });
    }
    if (best) {
      update((r) => ({ ...r, style: { ...r.style, ...best } }), true);
      setToast("已调整字号和行距为一页，可撤销恢复");
    } else setToast("内容较多，建议精简文字后再尝试适配一页");
  }
  return fitOnePage;
}
