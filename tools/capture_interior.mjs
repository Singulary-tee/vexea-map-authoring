// Capture interior player-eye frames (built map interiors).
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const local = new URL('../node_modules/', import.meta.url).pathname;
const require = createRequire(existsSync(local) ? local : '/workspaces/vexea-international/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
const shotTimeoutMs = Number(process.env.SCREENSHOT_TIMEOUT_MS || 30000);
const failures = [];
const spots = ['core-objective', 'loading-hall', 'tunnel', 'security-hall', 'maintenance'];
const closeBrowser = () => Promise.race([
  b.close().catch(() => {}),
  new Promise(resolve => setTimeout(resolve, 5000)),
]);
pg.on('pageerror', e => console.log('[pgerr]', e.message));
try {
  await pg.goto('http://127.0.0.1:3000/editor/blockout-viewer.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 30000 });
  await pg.waitForTimeout(500);
  for (const name of spots) {
    const ok = await pg.evaluate((n) => window.__interiorCam(n), name);
    if (!ok) { console.log('MISS', name); continue; }
    await pg.waitForTimeout(300);
    try {
      await pg.screenshot({ path: `artifacts/blockout-int-${name}.png`, timeout: shotTimeoutMs });
      console.log('shot', name);
    } catch (error) {
      failures.push(name);
      console.log('FAIL', name, error.message);
    }
  }
} finally {
  await closeBrowser();
}
console.log(`INTERIOR CAPTURE: ${spots.length - failures.length}/${spots.length} shots written`);
process.exit(failures.length ? 1 : 0);
