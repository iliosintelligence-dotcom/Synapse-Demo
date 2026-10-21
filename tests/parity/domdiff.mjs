// Compares the DOM of each original page with the DOM of the page Next built for it, without a browser.
//
//   node domdiff.mjs            every ported page
//   node domdiff.mjs toju       one page
//
// A screenshot can only show what is visible; this shows everything else a conversion can lose: an attribute React dropped (muted, hidden ...), a
// changed entity, a moved script, a different value. Both documents are parsed the way a browser parses them, then reduced to the same shape:
// comments and attribute order are ignored, runs of whitespace count as one, and whitespace-only text between things is ignored (the screenshots
// settle whether such whitespace is visible). Everything else must be equal.
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const web = join(repo, "web");
const { parse } = createRequire(join(web, "package.json"))("parse5");
const { PAGES } = await import(pathToFileURL(join(web, "scripts/port-legacy.mjs")).href);

// differences that are not differences
const IGNORE_ATTR = (tag, name, value) =>
  (tag === "meta" && name === "content" && /initial-scale/.test(value)) || // viewport: "1.0" and "1" are the same
  (tag === "html" && name === "data-theme");
const SKIP_ELEMENT = (n) =>
  (n.nodeName === "meta" && n.attrs.some((a) => (a.name === "charset") || (a.name === "name" && (a.value === "next-size-adjust" || a.value === "viewport")))) ||
  (n.nodeName === "link" && n.attrs.some((a) => a.name === "rel" && a.value === "preload"));

const norm = (s) => s.replace(/\s+/g, " ").trim();
const asBool = (v) => v;

function shape(node, out, path) {
  if (node.nodeName === "#comment" || node.nodeName === "#documentType") return;
  const tag = node.tagName || node.nodeName;
  const attrs = (node.attrs || [])
    .filter((a) => !IGNORE_ATTR(tag, a.name, a.value))
    .map((a) => `${a.name}=${a.name === "style" ? norm(a.value).replace(/\s*;\s*$/, "").replace(/\s*;\s*/g, ";").replace(/\s*:\s*/g, ":") : a.value}`)
    .sort();
  out.push({ path, open: tag, attrs });
  const kids = node.content ? node.content.childNodes : node.childNodes || [];
  // scripts and styles: their text is code and is compared as written
  if (tag === "script" || tag === "style") {
    out.push({ path, code: kids.map((k) => (k.nodeName === "#text" ? k.value : "")).join("").trim() });
    return;
  }
  // adjacent text nodes (React separates them with comments) count as one
  let buf = null, idx = 0;
  const groups = [];
  const flush = () => { if (buf != null) { const t = norm(buf); if (t) groups.push({ sensitive: true, entries: [{ path: `${path}/${tag}#text`, text: t }] }); buf = null; } };
  for (const k of kids) {
    if (k.nodeName === "#comment") continue;
    if (k.nodeName === "#text") { buf = (buf ?? "") + k.value; continue; }
    flush();
    if (SKIP_ELEMENT(k)) continue;
    const entries = [];
    shape(k, entries, `${path}/${tag}[${idx++}]`);
    const kt = k.tagName || k.nodeName;
    const rel = (k.attrs || []).find((a) => a.name === "rel")?.value;
    // In <head> React moves title, meta and most link tags forward; the order of scripts, styles and stylesheets is what the cascade depends on.
    const sensitive = tag !== "head" || kt === "script" || kt === "style" || (kt === "link" && rel === "stylesheet");
    groups.push({ sensitive, entries });
  }
  flush();
  for (const g of groups.filter((g) => g.sensitive)) out.push(...g.entries);
  const loose = groups.filter((g) => !g.sensitive).map((g) => g.entries);
  loose.sort((x, y) => (JSON.stringify(x.map(({ path: _p, ...r }) => r)) < JSON.stringify(y.map(({ path: _p, ...r }) => r)) ? -1 : 1));
  for (const l of loose) out.push(...l);
}

function load(file) {
  const doc = parse(readFileSync(file, "utf8"));
  const html = doc.childNodes.find((n) => n.nodeName === "html");
  const out = [];
  shape(html, out, "");
  return out;
}

const key = process.argv[2];
const keys = key ? [key] : Object.keys(PAGES);
let bad = 0;
for (const k of keys) {
  const spec = PAGES[k];
  const built = join(web, "out", spec.route, "index.html");
  if (!existsSync(built)) { console.log(`MISSING  ${k}: build the app first (npm run build in web/)`); bad++; continue; }
  const a = load(join(repo, spec.src));
  const b = load(built);
  const show = (e) => (e === undefined ? "(nothing)" : e.open ? `<${e.open} ${e.attrs.join(" ")}>` : e.code !== undefined ? `CODE ${JSON.stringify(e.code.slice(0, 120))}` : `TEXT ${JSON.stringify(e.text.slice(0, 120))}`);
  const same = (x, y) => JSON.stringify(x) === JSON.stringify({ ...y });
  let diffs = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n && diffs < 8; i++) {
    const strip = ({ path, ...rest }) => rest;
    if (a[i] === undefined || b[i] === undefined || JSON.stringify(strip(a[i])) !== JSON.stringify(strip(b[i]))) {
      if (diffs === 0) console.log(`DIFF  ${k}  (${a.length} nodes in the original, ${b.length} in Next)`);
      console.log(`   #${i}  ${a[i]?.path ?? b[i]?.path}\n      orig: ${show(a[i])}\n      next: ${show(b[i])}`);
      diffs++;
      if (diffs >= 3) break;
    }
  }
  if (diffs) bad++; else console.log(`same  ${k}  (${a.length} nodes)`);
}
process.exit(bad ? 1 : 0);
