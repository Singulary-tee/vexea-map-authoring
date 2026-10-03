#!/usr/bin/env node
// Survey compositor: assembles PNG tiles + labels (and optional crops of a source
// image) into one labeled grid screenshot, in the style of the reference survey.
// Usage: node tools/compose-survey.mjs --out out.png --cols 3 --tw 620 --th 388 --tiles '[{"src":"a.png","label":"..."},{"src":"ref.png","crop":[1280,0,1536,256],"label":"reference target"}]'
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const arg = n => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
const out = arg('--out');
const cols = Number(arg('--cols') || 3);
const tw = Number(arg('--tw') || 620);
const th = Number(arg('--th') || 388);
const tiles = JSON.parse(arg('--tiles'));
const PORT = 3723;
const root = process.cwd();
const pageHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#0b0f14}
#grid{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:10px;padding:10px;background:#0b0f14}
.tile{position:relative;width:${tw}px;height:${th}px;background:#151b22;overflow:hidden}
.tile img{width:100%;height:100%;object-fit:cover;display:block}
.tile .lb{position:absolute;top:6px;left:6px;background:#0c1116d9;color:#dfe8f0;font:600 15px monospace;padding:3px 9px;border-radius:3px}
</style></head><body><div id="grid"></div>
<script>
const tiles = ${JSON.stringify(tiles)};
const grid = document.getElementById('grid');
let pending = tiles.length;
for (const t of tiles) {
  const d = document.createElement('div'); d.className = 'tile';
  const img = document.createElement('img');
  if (t.crop) {
    const c = document.createElement('canvas'); c.width = t.crop[2]-t.crop[0]; c.height = t.crop[3]-t.crop[1];
    const src = new Image(); src.onload = () => {
      c.getContext('2d').drawImage(src, t.crop[0], t.crop[1], t.crop[2]-t.crop[0], t.crop[3]-t.crop[1], 0, 0, c.width, c.height);
      img.src = c.toDataURL(); maybe();
    };
    src.src = '/' + t.src;
  } else {
    img.onload = maybe; img.src = '/' + t.src;
  }
  const lb = document.createElement('div'); lb.className = 'lb'; lb.textContent = t.label;
  d.append(img, lb); grid.append(d);
}
function maybe(){ if(--pending === 0) window.__composed = true; }
</script></body></html>`;
fs.mkdirSync('.context/ab/compose', { recursive: true });
fs.writeFileSync('.context/ab/compose/index.html', pageHtml);
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
try {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await b.newPage({ viewport: { width: cols * tw + 20 + 20, height: Math.ceil(tiles.length / cols) * (th + 10) + 20 } });
  await page.goto(`http://127.0.0.1:${PORT}/.context/ab/compose/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction('window.__composed === true', null, { timeout: 30000 });
  await page.waitForTimeout(200);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: true });
  console.log('composed', out);
  await b.close();
} finally {
  server.kill();
}
