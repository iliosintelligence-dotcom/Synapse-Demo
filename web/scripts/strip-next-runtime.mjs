// After `next build`: make the ported pages plain HTML again.
//
// The ported pages (scripts/port-legacy.mjs) are written as Next pages, but they are not React applications: each one's own scripts build and
// change the page after it loads, exactly as they did on the static site. If Next's client runtime were left on them, React would try to
// "hydrate" markup those scripts had already changed, and either complain or throw the page away and draw it again. So the runtime is removed from
// exactly these pages: Next's chunks, its flight data (a second copy of the whole page, as a script), and the preload hints React adds.
// What is left is the page as the original had it, in the original order, byte for byte where it matters.
//
// The React pages (chat, browse, portal ...) are not in the list and keep their runtime.
//
// This only works if the host serves out/ as it is: vercel.json says `"framework": null` and `"outputDirectory": "out"` for that reason. With the
// Next framework preset Vercel's own builder re-reads the build and ships its own copy of each page, and this step has no effect on it.
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES } from "./port-legacy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const out = join(web, "out");
if (!existsSync(out)) { console.error("No out/ folder: run `next build` first."); process.exit(1); }

const STRIP = [
  /<script\b[^>]*\bsrc="\/_next\/[^"]*"[^>]*><\/script>/g,
  /<script>\(?self\.__next_f[\s\S]*?<\/script>/g,
  /<link\b[^>]*\brel="preload"[^>]*\/?>/g,
  /<meta name="next-size-adjust"[^>]*\/?>/g,
  /<script id="_R_">[\s\S]*?<\/script>/g, // Turbopack's chunk list for the runtime that is gone
  /<div hidden=""><!--\$--><!--\/\$--><\/div>/g, // where Next parks streamed metadata: an extra first child of <body>
  /<!--\$--><!--\/\$-->/g, // empty Suspense markers
];

const log = [];
let pages = 0, bytesBefore = 0, bytesAfter = 0, problems = 0;

for (const [key, spec] of Object.entries(PAGES)) {
  const dir = spec.route ? join(out, spec.route) : out;
  const file = join(dir, "index.html");
  if (!existsSync(file)) { console.error(`MISSING ${file} (${key})`); problems++; continue; }
  const before = readFileSync(file, "utf8");
  let html = before;
  for (const re of STRIP) html = html.replace(re, "");
  // javascript: URLs React would not write (see port-legacy.mjs): put back as the page had them
  const registry = join(web, "src/legacy", key, "javascript-urls.json");
  if (existsSync(registry)) {
    const urls = JSON.parse(readFileSync(registry, "utf8"));
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    urls.forEach((u, i) => { html = html.replace(new RegExp(`"#syn-js-url-${i}"`, "g"), () => `"${esc(u)}"`); });
  }
  const left = (html.match(/\/_next\//g) || []).length;
  if (left) { problems++; console.error(`${key}: ${left} reference(s) to Next's runtime are still in the page`); }
  writeFileSync(file, html);
  // the route's flight files serve only Next's client router, which these pages never start
  for (const name of readdirSync(dir)) if (name === "index.txt" || name.startsWith("__next.")) rmSync(join(dir, name), { force: true, recursive: true });
  pages++; bytesBefore += before.length; bytesAfter += html.length;
  log.push(`${key}: ${before.length} -> ${html.length} bytes, ${left} runtime refs left`);
}

// A note in the build output saying what this step did, so a deployment can be checked without its build log: /__strip.txt
writeFileSync(join(out, "__strip.txt"), [`strip-next-runtime ran at ${new Date().toISOString()}`, `VERCEL=${process.env.VERCEL ? "yes" : "no"}  pages cleaned: ${pages}  problems: ${problems}`, ...log].join("\n") + "\n");

console.log(`Stripped Next's runtime from ${pages} ported pages: ${(bytesBefore / 1e6).toFixed(1)} MB -> ${(bytesAfter / 1e6).toFixed(1)} MB.`);
if (!pages || problems) { console.error("The ported pages were not all cleaned: failing the build rather than shipping pages that would break."); process.exit(1); }
