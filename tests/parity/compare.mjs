// Pixel comparison of an original static page with its Next.js port.
//
//   node compare.mjs landing                       one pair, both viewports, both themes
//   node compare.mjs all                           every pair in pairs.json
//   node compare.mjs chat --vp mobile --theme dark one cell of the matrix
//   node compare.mjs chat --tol 0.1                allow up to 0.1% of pixels to differ (default 0: identical)
//
// ORIG (default http://localhost:4001) serves the original static site (the repository root); NEXT (default http://localhost:4002) serves web/out with
// vercel.json applied. Both answer at the same address, e.g. /app/toju.html, so a page is compared with its own port.
// Start them:  node serve.mjs ../.. 4001   and   node serve.mjs ../../web/out 4002 ../../web/vercel.json
// Output: out/<pair>/<vp>-<theme>-{orig,next,diff}.png, a summary line per cell, and the worst regions so a difference can be found fast.
import { chromium } from "playwright-core";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ORIG = (process.env.ORIG || "http://localhost:4001").replace(/\/$/, ""); // the original static site
const NEXT = (process.env.NEXT || "http://localhost:4002").replace(/\/$/, ""); // the Next build (web/out) with vercel.json applied
const pairs = JSON.parse(fs.readFileSync(path.join(here, "pairs.json"), "utf8"));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const want = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1]?.startsWith("--") !== true) || "all";
const tol = Number(flag("tol", "0"));
const VPS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const vps = flag("vp") ? [flag("vp")] : ["desktop", "mobile"];
const themes = flag("theme") ? [flag("theme")] : ["light", "dark"];
const full = !args.includes("--viewport-only");
const wantDom = args.includes("--dom"); // also compare the page's DOM after its scripts have run
/** A page's DOM reduced to what matters: no comments, no whitespace between tags, no head bookkeeping. */
const squash = (h) => h
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<meta[^>]*(charset|next-size-adjust|name="viewport")[^>]*>/gi, "")
  .replace(/>\s+</g, "><")
  .replace(/\s+/g, " ");

const candidates = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);
const executablePath = candidates.find((p) => fs.existsSync(p));
if (!executablePath) { console.error("No Chrome found. Set CHROME=<path to chrome.exe>."); process.exit(2); }

// 12:00 and 22:00 in Lagos (the landing pages go dark by the visitor's clock between 7pm and 7am).
const CLOCK = { light: "2026-10-21T12:00:00+01:00", dark: "2026-10-21T22:00:00+01:00" };

async function shoot(browser, base, url, vp, theme, pair) {
  const ctx = await browser.newContext({
    viewport: VPS[vp], deviceScaleFactor: 1, colorScheme: theme, locale: "en-NG", timezoneId: "Africa/Lagos",
    reducedMotion: "reduce", isMobile: false,
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(CLOCK[theme]));
  // the same remembered state for both sides: the theme choice, cookie consent given, no previous arrival
  await page.addInitScript(([t, state]) => {
    try {
      localStorage.setItem("synapse_theme_v1", t);
      localStorage.setItem("theme", t);
      for (const [k, v] of Object.entries(state || {})) localStorage.setItem(k, v);
    } catch { /* storage unavailable */ }
  }, [theme, pair.state]);
  await page.goto(base + url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  if (pair.wait) await page.waitForSelector(pair.wait, { timeout: 10000 }).catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal,#__next-build-watcher,[data-nextjs-toast]{display:none!important}" });
  await page.waitForTimeout(pair.settle ?? 1500);
  if (pair.act) await page.evaluate(pair.act).catch(() => {});
  await page.waitForTimeout(300);
  const buf = await page.screenshot({ fullPage: full, animations: "disabled", caret: "hide" });
  const title = await page.title();
  // the body as the page's own scripts left it, for --dom (the head is compared by domdiff.mjs: React moves title and meta tags forward there)
  const dom = wantDom ? await page.evaluate(() => document.body.outerHTML).catch(() => "") : "";
  await ctx.close();
  return { png: PNG.sync.read(buf), title, dom };
}

function pad(png, w, h) {
  if (png.width === w && png.height === h) return png;
  const out = new PNG({ width: w, height: h });
  for (let i = 0; i < out.data.length; i += 4) { out.data[i] = 255; out.data[i + 1] = 0; out.data[i + 2] = 255; out.data[i + 3] = 255; }
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

function regions(diff, w, h, size = 64) {
  const cols = Math.ceil(w / size), rows = Math.ceil(h / size), grid = new Array(cols * rows).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 0) grid[Math.floor(y / size) * cols + Math.floor(x / size)]++;
  }
  return grid.map((n, i) => ({ n, x: (i % cols) * size, y: Math.floor(i / cols) * size })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);
}

const names = want === "all" ? Object.keys(pairs) : [want];
const browser = await chromium.launch({ executablePath, headless: true });
let failed = 0;
for (const name of names) {
  const pair = pairs[name];
  if (!pair) { console.error(`No pair called "${name}". Known: ${Object.keys(pairs).join(", ")}`); process.exit(2); }
  const dir = path.join(here, "out", name);
  fs.mkdirSync(dir, { recursive: true });
  for (const vp of vps) for (const theme of themes) {
    const cell = `${name} ${vp}/${theme}`;
    try {
      const [a, b] = await Promise.all([shoot(browser, ORIG, pair.orig ?? pair.path, vp, theme, pair), shoot(browser, NEXT, pair.next ?? pair.path, vp, theme, pair)]);
      const w = Math.max(a.png.width, b.png.width), h = Math.max(a.png.height, b.png.height);
      const A = pad(a.png, w, h), B = pad(b.png, w, h), D = new PNG({ width: w, height: h });
      const bad = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.05, includeAA: false, diffColor: [255, 0, 0], alpha: 0.25 });
      const pct = (bad / (w * h)) * 100;
      const stem = path.join(dir, `${vp}-${theme}`);
      fs.writeFileSync(`${stem}-orig.png`, PNG.sync.write(a.png));
      fs.writeFileSync(`${stem}-next.png`, PNG.sync.write(b.png));
      fs.writeFileSync(`${stem}-diff.png`, PNG.sync.write(D));
      const sizeNote = a.png.width !== b.png.width || a.png.height !== b.png.height ? `  SIZE orig ${a.png.width}x${a.png.height} vs next ${b.png.width}x${b.png.height}` : "";
      const ok = pct <= tol && !sizeNote;
      if (!ok) failed++;
      let domNote = "";
      if (wantDom) {
        const x = squash(a.dom), y = squash(b.dom);
        if (x === y) domNote = "  DOM same";
        else {
          let i = 0;
          while (i < x.length && x[i] === y[i]) i++;
          domNote = `  DOM differs at ${i}:\n      orig: ${JSON.stringify(x.slice(Math.max(0, i - 60), i + 140))}\n      next: ${JSON.stringify(y.slice(Math.max(0, i - 60), i + 140))}`;
          failed++;
        }
      }
      console.log(`${ok ? "PASS" : "FAIL"}  ${cell.padEnd(26)} ${pct.toFixed(3)}% (${bad}px)${sizeNote}${a.title !== b.title ? `  TITLE "${a.title}" vs "${b.title}"` : ""}${domNote}`);
      if (!ok && bad) console.log("      worst 64px blocks (x,y: px):", regions(D, w, h).map((r) => `${r.x},${r.y}:${r.n}`).join("  "));
    } catch (e) { failed++; console.log(`ERR   ${cell}  ${e.message.split("\n")[0]}`); }
  }
}
await browser.close();
console.log(failed ? `\n${failed} cell(s) differ.` : "\nAll cells identical.");
process.exit(failed ? 1 : 0);
