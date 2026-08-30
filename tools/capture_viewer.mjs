// Screenshot editor/viewer.html via node playwright (from vexea-international node_modules).
// usage: node capture_viewer.mjs [url] [out]
import { createRequire } from 'node:module';
const require = createRequire('/workspaces/vexea-international/node_modules/');
const { chromium } = require('playwright');

const url = process.argv[2] || 'http://127.0.0.1:8123/viewer.html';
const out = process.argv[3] || '/tmp/facility-v3-shot.png';
const b = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
pg.on('console', m => console.log('[pg]', m.type(), m.text()));
pg.on('pageerror', e => console.log('[pgerr]', e.message));
await pg.goto(url);
try { await pg.waitForFunction('window.__ready === true || window.__err', null, { timeout: 15000 }); } catch {}
await pg.waitForTimeout(1500);
await pg.screenshot({ path: out });
await b.close();
console.log('shot-ok', out);
