import http from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const envFile = process.env.NORMAN_ENV || join(homedir(), ".norman.env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
else console.log(`No ${envFile} found, so Google sign-in and R2 stay off.`);

const port = 4174;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const api = url.pathname.match(/^\/api\/([a-z]+)$/);
  if (api) {
    let handler;
    try {
      handler = (await import(pathToFileURL(join(root, "api", `${api[1]}.js`)).href))[req.method];
    } catch {
      handler = null;
    }
    if (!handler) return res.writeHead(404).end();
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    return res.end(Buffer.from(await response.arrayBuffer()));
  }
  const path = url.pathname.endsWith("/") ? `${url.pathname}index.html` : extname(url.pathname) ? url.pathname : `${url.pathname}.html`;
  const file = normalize(join(root, path));
  if (!file.startsWith(root + sep) || file.includes(`${sep}node_modules${sep}`)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => console.log(`Website 2 with its backend: http://localhost:${port}/`));
