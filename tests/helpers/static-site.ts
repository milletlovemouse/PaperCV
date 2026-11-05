import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Serve dist under a GitHub Pages style project path, with no SPA fallback or API. */
export async function staticSite() {
  const root = path.resolve("dist");
  const prefix = "/papercv/";
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".woff2": "font/woff2",
    ".svg": "image/svg+xml",
  };
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    const file = path.resolve(root, decodeURIComponent(pathname.slice(prefix.length)) || "index.html");
    if (!pathname.startsWith(prefix) || !file.startsWith(root + path.sep)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const bytes = await readFile(file);
      response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
      response.end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Static test server failed");
  return {
    url: `http://127.0.0.1:${address.port}${prefix}`,
    close: () =>
      new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
