// Writes the app icon and the splash screen into the Android and iOS projects, from the images in web/resources/.
//
//   node scripts/make-app-icons.mjs
//
// resources/icon-only.png        the store icon and iOS icon: the mark on cream, opaque (iOS refuses transparency)
// resources/icon-foreground.png  the Android adaptive-icon layer: the mark on transparent, inside the 66% safe zone
// resources/splash*.png          the mark on cream (light) and on black (dark)
// Replace those PNGs to change the artwork, then run this. Re-runnable; it only writes icon and splash files.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const res = (f) => join(web, "resources", f);
const android = join(web, "android/app/src/main/res");
const ios = join(web, "ios/App/App/Assets.xcassets");
const CREAM = { r: 250, g: 246, b: 240, alpha: 1 };
const out = async (img, file) => { mkdirSync(dirname(file), { recursive: true }); await img.png().toFile(file); };

// ── Android launcher icons ─────────────────────────────────────────────────────────────────────────
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
for (const [d, px] of Object.entries(LEGACY)) {
  const dir = join(android, `mipmap-${d}`);
  await out(sharp(res("icon-only.png")).resize(px, px), join(dir, "ic_launcher.png"));
  const round = Buffer.from(`<svg width="${px}" height="${px}"><circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}" fill="#fff"/></svg>`);
  await out(sharp(res("icon-only.png")).resize(px, px).composite([{ input: round, blend: "dest-in" }]), join(dir, "ic_launcher_round.png"));
}
for (const [d, px] of Object.entries(ADAPTIVE)) await out(sharp(res("icon-foreground.png")).resize(px, px), join(android, `mipmap-${d}`, "ic_launcher_foreground.png"));
writeFileSync(join(android, "values/ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FAF6F0</color>\n</resources>\n`);

// ── Android splash (portrait and landscape, every density) ─────────────────────────────────────────
const SPLASH = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
const markPng = await sharp(res("splash.png")).resize({ height: 600 }).png().toBuffer(); // only used for its proportions below
const mark = sharp(res("splash.png"));
async function splashAt(w, h) {
  // cut the mark out of the 2732 splash (cream square, mark in the middle) and set it on a cream canvas of the target size
  const size = Math.round(Math.min(w, h) * 0.5);
  const crop = await sharp(res("splash.png")).extract({ left: 866, top: 866, width: 1000, height: 1000 }).resize(size, size).png().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 4, background: CREAM } }).composite([{ input: crop, gravity: "center" }]);
}
void markPng; void mark;
for (const [d, [w, h]] of Object.entries(SPLASH)) {
  await out(await splashAt(w, h), join(android, `drawable-port-${d}`, "splash.png"));
  await out(await splashAt(h, w), join(android, `drawable-land-${d}`, "splash.png"));
}
await out(await splashAt(480, 320), join(android, "drawable", "splash.png"));

// ── iOS ────────────────────────────────────────────────────────────────────────────────────────────
await out(sharp(res("icon-only.png")).resize(1024, 1024).flatten({ background: CREAM }), join(ios, "AppIcon.appiconset", "AppIcon-512@2x.png"));
for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) await out(sharp(res("splash.png")), join(ios, "Splash.imageset", f));

console.log("Icons and splash written for Android and iOS.");
