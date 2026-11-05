import customMedia from "postcss-custom-media";
import nesting from "postcss-nesting";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  css: { postcss: { plugins: [customMedia(), nesting()] } },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@resume": fileURLToPath(new URL("./shared/resume", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "@radix-ui/themes",
      "radix-ui",
      "react-datepicker",
      "date-fns/locale/zh-CN",
    ],
  },
  server: {
    strictPort: true,
    fs: {
      deny: [
        "**/.git/**",
        "**/.env",
        "**/.env.*",
        "**/*.{crt,pem}",
        "**/research/**",
        "**/scripts/**",
        "**/tests/**",
        "**/backups/**",
      ],
    },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
