import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(HERE, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(HERE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(8123, r));

const args = process.argv.slice(2);
const size = Number(args.find((a) => /^\d+$/.test(a)) || 720);
const ss = Number((args.find((a) => a.startsWith('ss=')) || 'ss=2').slice(3));
let ids = args.filter((a) => !/^\d+$/.test(a) && !a.startsWith('ss='));

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
page.on('console', (m) => { const t = m.text(); if (!/GPU stall|swiftshader/i.test(t)) console.log('[page]', t.slice(0, 300)); });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)));
await page.goto('http://localhost:8123/index.html');
await page.waitForFunction(() => window.ZYN_READY === true, null, { timeout: 60000 });
if (!ids.length || ids[0] === 'all') ids = await page.evaluate(() => window.ZYN.states);
for (const id of ids) {
  const t0 = Date.now();
  const url = await page.evaluate(([i, s, q]) => window.ZYN.render(i, s, q), [id, size, ss]);
  fs.writeFileSync(path.join(OUT, id + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  console.log('rendered', id, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
await browser.close(); server.close();
