import { useEffect, useState } from "react";
import { STORAGE_KEY, type Resume } from "@resume/model";

export function useResumePersistence(resume: Resume) {
  const [saveState, setSaveState] = useState("已保存到本机");
  useEffect(() => {
    setSaveState("正在保存…");
    let pending = true;
    const timer = setTimeout(save, 400);
    function save() {
      if (!pending) return;
      clearTimeout(timer);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
        pending = false;
        setSaveState("已保存到本机");
      } catch {
        setSaveState("本机保存失败，请导出备份");
      }
    }
    function saveWhenHidden() {
      if (document.visibilityState === "hidden") save();
    }
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [resume]);
  return saveState;
}
