import { ATTACHMENT_NAME, normalizeResume, type Resume } from "@resume/model";
import { parseResumeLayout, type PDFTextPage } from "./import-layout";

export interface ImportResult {
  resume: Resume;
  mode: "editable" | "text";
  pages: number;
  text: string;
}
export async function importPDF(file: File): Promise<ImportResult> {
  if (file.size > 20 * 1024 * 1024) throw new Error("请选择 20 MB 以内的 PDF");
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
  }).promise;
  try {
    const attachments = (await pdf.getAttachments()) as Record<
      string,
      { filename: string; content: Uint8Array }
    > | null;
    const editable =
      attachments && Object.values(attachments).find((item) => item.filename === ATTACHMENT_NAME);
    if (editable) {
      if (editable.content.byteLength > 8_000_000) throw new Error("PDF 内嵌简历数据过大");
      const resume = normalizeResume(JSON.parse(new TextDecoder().decode(editable.content)));
      return { resume, mode: "editable", pages: pdf.numPages, text: "" };
    }
    if (pdf.numPages > 20) throw new Error("请导入 20 页以内的简历 PDF");
    const pages: PDFTextPage[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });
      const items: PDFTextPage["items"] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const transform = pdfjs.Util.transform(viewport.transform, item.transform);
        items.push({
          x: transform[4],
          y: transform[5],
          width: item.width,
          text: item.str,
          size: Math.hypot(transform[0], transform[1]) || item.height || 12,
        });
      }
      pages.push({ width: viewport.width, height: viewport.height, items });
      page.cleanup();
    }
    const { resume, text } = parseResumeLayout(pages, file.name);
    return { resume, mode: "text", pages: pdf.numPages, text };
  } finally {
    await pdf.destroy();
  }
}
