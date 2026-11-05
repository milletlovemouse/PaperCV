import type { Resume } from "@resume/model";
import { getPrintTitle } from "../lib/print-title";

let activePrint: Promise<void> | undefined;

/** Load a separate document so printing never changes the editor or its saved data. */
export function printResume(resume: Resume): Promise<void> {
  if (activePrint) return activePrint;
  const snapshot = structuredClone(resume);
  activePrint = new Promise<void>((resolve, reject) => {
    const previousTitle = document.title;
    const printTitle = getPrintTitle(snapshot.title);
    // macOS print dialogs use the top-level document title for the suggested filename.
    document.title = printTitle;
    const token = crypto.randomUUID();
    const url = new URL(import.meta.env.BASE_URL, location.href);
    url.searchParams.set("print", token);
    const frame = document.createElement("iframe");
    frame.title = "简历打印";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    Object.assign(frame.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "1000px",
      height: "1000px",
      border: "0",
      pointerEvents: "none",
    });
    const previousFocus = document.activeElement;
    let opened = false;
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(timeout);
      window.removeEventListener("message", receive);
      window.removeEventListener("pagehide", cleanup);
      frame.remove();
      document.title = previousTitle;
      activePrint = undefined;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
    const fail = (message: string) => {
      cleanup();
      reject(new Error(message));
    };
    const timeout = window.setTimeout(() => fail("打印准备超时，请检查字体或图片加载后重试"), 60000);
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.contentWindow ||
        event.data?.token !== token
      )
        return;
      if (event.data.type === "papercv:ready") {
        frame.contentWindow?.postMessage(
          { type: "papercv:resume", token, resume: snapshot },
          location.origin,
        );
      } else if (event.data.type === "papercv:error") {
        fail("简历打印排版失败，请检查内容或图片后重试");
      } else if (event.data.type === "papercv:rendered" && !opened) {
        opened = true;
        clearTimeout(timeout);
        // afterprint also fires when the user cancels. Do not report a file as saved.
        frame.contentWindow?.addEventListener("afterprint", () => setTimeout(cleanup, 0), { once: true });
        try {
          frame.contentWindow?.print();
          resolve();
        } catch {
          fail("浏览器无法打开打印窗口，请允许打印后重试");
        }
      }
    };
    window.addEventListener("message", receive);
    window.addEventListener("pagehide", cleanup, { once: true });
    frame.addEventListener("error", () => fail("打印页面加载失败，请重试"), { once: true });
    frame.src = url.href;
    document.body.append(frame);
  });
  return activePrint;
}
