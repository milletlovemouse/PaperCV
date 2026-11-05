import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("papercv.theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      /* Use system preference. */
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
    try {
      localStorage.setItem("papercv.theme", theme);
    } catch {
      /* Theme remains usable without persistence. */
    }
  }, [theme]);
  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key === "papercv.theme" && (event.newValue === "light" || event.newValue === "dark"))
        setTheme(event.newValue);
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);
  return { theme, setTheme };
}
