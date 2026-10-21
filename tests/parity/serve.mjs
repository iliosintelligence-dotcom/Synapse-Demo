// A small static server that behaves like the live site, for the pixel comparison.
//   node serve.mjs <folder> <port> [vercel.json]
// Serves files as they are (no .html guessing, folders answer with index.html), and applies the rewrites and redirects of the given vercel.json
// the way Vercel does, so /app/toju.html reaches the page Next built for it while the address bar (and so every relative path in the page) stays put.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [dir, port, cfgPath] = process.argv.slice(2);
if (!dir || !port) { console.error("usage: node serve.mjs <folder> <port> [vercel.json]"); process.exit(2); }
const root = path.resolve(dir);
const cfg = cfgPath ? JSON.parse(fs.readFileSync(cfgPath, "utf8")) : {};
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".xml": "application/xml", ".map": "application/json" };

function compile(src) {
  let re = "^";
  const names = [];
  for (const part of src.split(/(:[A-Za-z_]+\*?)/)) {
    const m = part.match(/^:([A-Za-z_]+)(\*)?$/);
    if (m) { names.push(m[1]); re += m[2] ? "(.*)" : "([^/]+)"; } else re += part.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return { re: new RegExp(re + "$"), names };
}
const fill = (dest, names, match) => names.reduce((d, n, i) => d.replaceAll(`:${n}`, match[i + 1] ?? ""), dest);
const rules = (list) => (list || []).map((r) => ({ ...compile(r.source), r }));
const redirects = rules(cfg.redirects), rewrites = rules(cfg.rewrites);

function resolveFile(p) {
  let f = path.join(root, decodeURIComponent(p));
  if (!f.startsWith(root)) return null;
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (cfg.cleanUrls && !path.extname(f) && fs.existsSync(f + ".html")) f += ".html"; // /app/toju is app/toju.html
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let p = url.pathname;
  // cleanUrls: /app/toju.html answers with a redirect to /app/toju (and /index.html to /); trailingSlash off: /app/toju/ to /app/toju
  if (cfg.cleanUrls && p.endsWith(".html")) {
    res.writeHead(308, { Location: (p.endsWith("/index.html") ? p.slice(0, -"index.html".length) : p.slice(0, -5)) + url.search });
    return res.end();
  }
  if (cfg.trailingSlash === false && p.length > 1 && p.endsWith("/")) {
    res.writeHead(308, { Location: p.replace(/\/+$/, "") + url.search });
    return res.end();
  }
  for (const { re, names, r } of redirects) {
    const m = p.match(re);
    if (m) {
      const to = fill(r.destination, names, m);
      const join = to.includes("?") ? "&" : "?";
      res.writeHead(r.permanent ? 308 : 307, { Location: to + (url.search ? (to.includes("?") ? join + url.search.slice(1) : url.search) : "") });
      return res.end();
    }
  }
  let file = null;
  for (const { re, names, r } of rewrites) {
    const m = p.match(re);
    if (!m) continue;
    const to = fill(r.destination, names, m);
    if (/^https?:/.test(to)) { res.writeHead(502); return res.end("external rewrite not served locally"); }
    p = to.split("?")[0];
    break;
  }
  file = resolveFile(p);
  if (!file && cfg.trailingSlash && !path.extname(p) && !p.endsWith("/") && resolveFile(p + "/")) {
    res.writeHead(308, { Location: p + "/" + url.search });
    return res.end();
  }
  if (!file) {
    const nf = path.join(root, "404.html");
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "Not found");
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}).listen(Number(port), () => console.log(`serving ${root} on http://localhost:${port}`));
