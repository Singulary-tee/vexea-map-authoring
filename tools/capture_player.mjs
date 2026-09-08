// Capture player-eye walk-through frames along route_main_surface (built map).
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const local = new URL('../node_modules/', import.meta.url).pathname;
const require = createRequire(existsSync(local) ? local : '/workspaces/vexea-international/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
const shotTimeoutMs = Number(process.env.SCREENSHOT_TIMEOUT_MS || 30000);
const failures = [];
const stops = [[0.03, 'spawn'], [0.22, 'gate-square'], [0.42, 'pressure-yard'], [0.72, 'checkpoint'], [0.97, 'core-door']];
const closeBrowser = () => Promise.race([
  b.close().catch(() => {}),
  new Promise(resolve => setTimeout(resolve, 5000)),
]);
pg.on('pageerror', e => console.log('[pgerr]', e.message));
try {
  await pg.goto('http://127.0.0.1:3000/editor/blockout-viewer.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 30000 });
  await pg.waitForTimeout(500);
  for (const [t, name] of stops) {
    await pg.evaluate((tt) => window.__playerCamAt(tt), t);
    await pg.waitForTimeout(300);
    try {
      await pg.screenshot({ path: `artifacts/blockout-player-${name}.png`, timeout: shotTimeoutMs });
      console.log('shot', name);
    } catch (error) {
      failures.push(name);
      console.log('FAIL', name, error.message);
    }
  }
} finally {
  await closeBrowser();
}
console.log(`PLAYER CAPTURE: ${stops.length - failures.length}/${stops.length} shots written`);
process.exit(failures.length ? 1 : 0);
