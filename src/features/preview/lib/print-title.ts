export function getPrintTitle(title: string) {
  const safeTitle = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
    .trim();
  return safeTitle || "我的简历";
}
