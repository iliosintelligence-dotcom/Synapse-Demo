// Loads pages from the live site in a real browser and reports script errors and failed requests. Read-only.
//   node live-check.mjs [base]
import { chromium } from "playwright-core";
import fs from "node:fs";
const base = (process.argv[2] || "https://www.synapsecore.dev").replace(/\/$/, "");
const pages = ["/", "/buyers.html", "/privacy.html", "/terms.html", "/app/toju.html", "/app/browse.html", "/app/property.html", "/app/dream.html", "/app/signin.html", "/app/agency-profile.html", "/app/agency.html", "/app/go.html", "/app/your-data.html", "/app/verify.html", "/app/synapse.html"];
const exe = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true });
let bad = 0;
// SHARE=<token> opens a protected preview deployment first (Vercel's shareable-link cookie), then every page runs in that same context
const share = process.env.SHARE;
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
if (share) { const w = await ctx.newPage(); await w.goto(`${base}/?_vercel_share=${share}`, { waitUntil: "load" }).catch(() => {}); await w.close(); }
for (const p of pages) {
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
  page.on("response", (r) => { if (r.status() >= 400 && new URL(r.url()).origin === base) failed.push(`${r.status()} ${r.url().replace(base, "")}`); });
  await page.goto(base + p, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => ({ title: document.title, kids: document.body.children.length, text: document.body.innerText.length }));
  const ok = !errors.length && !failed.length && info.text > 50;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "BAD "} ${p.padEnd(26)} "${info.title}" body=${info.kids} children, ${info.text} chars${failed.length ? "  FAILED: " + failed.slice(0, 3).join(", ") : ""}${errors.length ? "  ERRORS: " + errors.slice(0, 2).join(" | ") : ""}`);
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
