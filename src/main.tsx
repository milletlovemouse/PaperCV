import "@fontsource-variable/noto-sans-sc";
import "@fontsource-variable/noto-serif-sc";
import "@/styles/radix.css";
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "@/styles/base.css";
import "@/styles/layout.css";
import "@/styles/presentation.css";
import "@/styles/templates.css";
import "@/styles/theme.css";
const App = lazy(() => import("@/app/App"));
const PrintPage = lazy(() => import("@/features/preview/components/PrintPage"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<p role="status">正在加载简历…</p>}>
      {new URLSearchParams(location.search).has("print") || location.pathname === "/print" ? (
        <PrintPage />
      ) : (
        <App />
      )}
    </Suspense>
  </React.StrictMode>,
);
