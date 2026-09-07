// Capture player-eye walk-through frames along route_main_surface (built map).
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const local = new URL('../node_modules/', import.meta.url).pathname;
const require = createRequire(existsSync(local) ? local : '/workspaces/vexea-international/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
pg.on('pageerror', e => console.log('[pgerr]', e.message));
await pg.goto('http://127.0.0.1:3000/editor/blockout-viewer.html');
await pg.waitForFunction('window.__ready === true', null, { timeout: 20000 });
await pg.waitForTimeout(800);
const stops = [[0.03, 'spawn'], [0.22, 'gate-square'], [0.42, 'pressure-yard'], [0.72, 'checkpoint'], [0.97, 'core-door']];
for (const [t, name] of stops) {
  await pg.evaluate((tt) => window.__playerCamAt(tt), t);
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: `artifacts/blockout-player-${name}.png` });
  console.log('shot', name);
}
await b.close();
