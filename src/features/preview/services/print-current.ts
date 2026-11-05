import { getPrintTitle } from "../lib/print-title";
import { paperSize } from "../lib/paper";
import type { Resume } from "@resume/model";

export type PrintResult = "requested" | "unavailable";

export function prefersCurrentDocumentPrint() {
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Reuse measured pages and fonts; briefly commit the title before opening native printing. */
export function printCurrentResume(resume: Resume, onDispose: () => void): Promise<PrintResult> {
  const preview = document.querySelector<HTMLElement>(".preview-panel .resume-preview");
  if (!preview || document.documentElement.dataset.pdfReady !== "true" || document.fonts.status === "loading")
    return Promise.reject(new Error("简历正在排版，请稍候再点导出 PDF"));
  const pages = preview.querySelectorAll(".paper-page");
  if (!pages.length || pages.length > 60 || preview.querySelector(".pagination-error"))
    return Promise.reject(new Error("简历打印排版失败，请检查内容或图片后重试"));
  for (const image of preview.querySelectorAll<HTMLImageElement>(".paper-page img")) {
    if (!image.complete) return Promise.reject(new Error("照片正在加载，请稍候再点导出 PDF"));
    if (!image.naturalWidth) return Promise.reject(new Error("照片加载失败，请更换照片后重试"));
  }
  const snapshot = preview.cloneNode(true) as HTMLElement;
  snapshot.classList.add("print-mode");
  // Native mobile printing may inspect layout before switching to print media.
  // The snapshot must never retain the editor's screen zoom.
  const stack = snapshot.querySelector<HTMLElement>(".paper-stack");
  if (stack) stack.style.zoom = "1";
  snapshot.querySelectorAll(".measure-shell, .paper-caption").forEach((node) => node.remove());
  const host = document.createElement("div");
  host.className = "current-print-document";
  host.setAttribute("aria-hidden", "true");
  host.append(snapshot);
  const rootStyle = document.documentElement.style;
  const widthProperty = "--current-print-page-width";
  const previousWidth = rootStyle.getPropertyValue(widthProperty);
  const previousWidthPriority = rootStyle.getPropertyPriority(widthProperty);
  const previousTitle = document.title;
  const previousFocus = document.activeElement;
  let started = false;
  let disposed = false;
  let idleTimer = 0;
  let fallbackTimer = 0;
  let titleTimer = 0;
  let titleFrame = 0;
  let invoking = false;
  const printTitle = getPrintTitle(resume.title);
  const printMedia = window.matchMedia("print");
  let resolve!: (result: PrintResult) => void;
  let reject!: (reason: Error) => void;
  const result = new Promise<PrintResult>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(idleTimer);
    clearTimeout(fallbackTimer);
    clearTimeout(titleTimer);
    cancelAnimationFrame(titleFrame);
    clearTimeout(watchdog);
    window.removeEventListener("beforeprint", beforePrint);
    window.removeEventListener("afterprint", finishedPrint);
    window.removeEventListener("focus", returned);
    window.removeEventListener("pagehide", finish);
    document.removeEventListener("visibilitychange", returned);
    printMedia.removeEventListener("change", mediaChanged);
    host.remove();
    delete document.documentElement.dataset.currentPrint;
    if (previousWidth) rootStyle.setProperty(widthProperty, previousWidth, previousWidthPriority);
    else rootStyle.removeProperty(widthProperty);
    document.title = previousTitle;
    onDispose();
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
  const beforePrint = () => {
    started = true;
    document.title = printTitle;
    clearTimeout(fallbackTimer);
  };
  const finish = () => {
    cleanup();
    resolve(started ? "requested" : "unavailable");
  };
  const finishedPrint = () => {
    // Native printing can enqueue a title read after afterprint. Keep the snapshot/title
    // through that task rather than restoring them inside the event itself.
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(finish, 300);
  };
  const returned = () => {
    if (started && document.visibilityState === "visible") finishedPrint();
  };
  const mediaChanged = () => {
    if (printMedia.matches) beforePrint();
    else if (started) finishedPrint();
  };
  // Some mobile browsers never emit afterprint. Do not leave a stale snapshot or lock indefinitely.
  const watchdog = window.setTimeout(finish, 120000);
  window.addEventListener("beforeprint", beforePrint);
  window.addEventListener("afterprint", finishedPrint, { once: true });
  window.addEventListener("focus", returned);
  window.addEventListener("pagehide", finish, { once: true });
  document.addEventListener("visibilitychange", returned);
  printMedia.addEventListener("change", mediaChanged);
  document.title = printTitle;
  document.body.append(host);
  // Size the whole print document, not just the sheet inside a narrow mobile viewport.
  rootStyle.setProperty(widthProperty, `${paperSize(resume.style.paper).width}mm`);
  document.documentElement.dataset.currentPrint = "true";
  const invokePrint = () => {
    if (disposed || invoking) return;
    invoking = true;
    clearTimeout(titleTimer);
    cancelAnimationFrame(titleFrame);
    try {
      // No network/font work here: stay within the tap's transient activation.
      document.title = printTitle;
      window.print();
      if (started || disposed) resolve(started ? "requested" : "unavailable");
      else
        fallbackTimer = window.setTimeout(() => {
          cleanup();
          resolve("unavailable");
        }, 1500);
    } catch {
      cleanup();
      reject(new Error("浏览器无法调用打印，请使用浏览器菜单中的“打印”（部分手机在“分享”中）"));
    }
  };
  // Let the title reach the browser UI before native print captures its filename.
  // Bound the wait so throttled animation frames cannot delay printing indefinitely.
  titleTimer = window.setTimeout(invokePrint, 100);
  titleFrame = requestAnimationFrame(() => {
    titleFrame = requestAnimationFrame(invokePrint);
  });
  return result;
}
