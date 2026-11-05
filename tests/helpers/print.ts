import type { Browser } from "playwright-core";
import type { Resume } from "../../shared/resume/model";

/** Test-only PDF capture of the same static document used by the browser print dialog. */
export async function renderPDF(
  browser: Browser,
  resume: Resume,
  baseURL = process.env.TEST_URL || "http://127.0.0.1:5173/",
) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  try {
    await context.route("**/api/**", (route) => {
      throw new Error(`Unexpected backend request: ${route.request().url()}`);
    });
    await context.addInitScript((data) => {
      window.__PRINT_RESUME__ = data;
    }, resume);
    const page = await context.newPage();
    const url = new URL(baseURL);
    url.searchParams.set("print", "test");
    await page.goto(url.href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.documentElement.dataset.printReady === "true");
    return await page.pdf({ printBackground: true, preferCSSPageSize: true, tagged: true });
  } finally {
    await context.close();
  }
}
