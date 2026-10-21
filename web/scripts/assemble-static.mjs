// Cutover step: put the static site beside the Next app so ONE project serves www.synapsecore.dev.
//
//   node scripts/assemble-static.mjs            show the plan and any conflicts, change nothing (the default)
//   node scripts/assemble-static.mjs --apply    copy the files into web/public/
//
// Nothing here deletes or overwrites anything: a file that already exists in web/public/ is left alone and reported, so the Next app's own images
// (signin, zyn, brand) cannot be clobbered by a same-named static one. The copy lives in git, so undoing it is `git checkout -- web/public && git clean -fd web/public`.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../.."); // the repository root (the static site)
const publicDir = resolve(here, "../public");
const apply = process.argv.includes("--apply");

// Allow-list, not a block-list: a new folder at the repo root (a worktree, test output, a design scratch pad) must never go live by accident.
const ITEMS = [
  "index.html", "buyers.html", "agencies.html", "privacy.html", "terms.html",
  "consent.js", "home-feed.js", "home.css", "home.js", "landing.css", "landing-mobile.css",
  "robots.txt", "sitemap.xml", "favicon.ico", "apple-touch-icon.png",
  "app", "images",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

// The Next app's own placeholder home page would write out/index.html on top of the real landing page.
const placeholder = resolve(here, "../src/app/page.tsx");
if (existsSync(placeholder)) {
  console.log(`BLOCKED  web/src/app/page.tsx still exists. It is a developer index, and it would collide with the landing page (index.html).
         Remove it first:  git rm web/src/app/page.tsx`);
  if (apply) process.exit(1);
}

let copied = 0, skipped = 0, missing = 0;
const conflicts = [];
for (const item of ITEMS) {
  const from = join(root, item);
  if (!existsSync(from)) { console.log(`MISSING  ${item}`); missing++; continue; }
  const files = statSync(from).isDirectory() ? [...walk(from)] : [from];
  for (const f of files) {
    const rel = relative(root, f);
    const to = join(publicDir, rel);
    if (existsSync(to)) { conflicts.push(rel); skipped++; continue; }
    copied++;
    if (apply) { mkdirSync(dirname(to), { recursive: true }); cpSync(f, to); }
  }
}

console.log(`${apply ? "Copied" : "Would copy"} ${copied} files. Left alone (already in web/public): ${skipped}. Missing from the repository: ${missing}.`);
if (conflicts.length) console.log(`Already present, not touched:\n  ${conflicts.slice(0, 40).join("\n  ")}${conflicts.length > 40 ? `\n  …and ${conflicts.length - 40} more` : ""}`);
if (!apply) console.log("\nThis was a dry run. Re-run with --apply to copy.");
