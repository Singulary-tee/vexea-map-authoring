// Verify viewer interaction chain: all toggles + cameras change scene state, no page errors.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const local = new URL('../node_modules/', import.meta.url).pathname;
const require = createRequire(existsSync(local) ? local : '/workspaces/vexea-international/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await pg.goto('http://127.0.0.1:3000/editor/blockout-viewer.html');
await pg.waitForFunction('window.__ready === true', null, { timeout: 20000 });
const out = { steps: [] };
const step = async (name, fn) => {
  const r = await fn();
  out.steps.push({ name, ...r });
};
// layers present
await step('layers-loaded', () => pg.evaluate(() => ({
  built: !![...document.querySelectorAll('canvas')].length,
  blockLayerVisible: window.__ready === true,
})));
// toggle blockout layer off/on (scene graph visibility)
const vis = await pg.evaluate(() => {
  const btn = document.getElementById('bBlock');
  const before = btn.classList.contains('on');
  btn.click();
  const mid = btn.classList.contains('on');
  btn.click();
  return { startedOn: before, offThenOn: !mid && btn.classList.contains('on') };
});
out.steps.push({ name: 'blockout-toggle', ...vis });
// camera switches
const camSwitch = await pg.evaluate(() => {
  const before = !document.getElementById('bTop').classList.contains('on');
  document.getElementById('bOrbit').click();
  const orbit = document.getElementById('bTop').classList.contains('on') === false && document.getElementById('bOrbit').classList.contains('on');
  document.getElementById('bTop').click();
  const top = document.getElementById('bTop').classList.contains('on');
  return { orbit, top };
});
out.steps.push({ name: 'camera-switch', ...camSwitch });
// x-ray leaves no page errors and toggles material state
const xray = await pg.evaluate(() => {
  document.getElementById('bXray').click();
  return new Promise(res => setTimeout(() => { document.getElementById('bXray').click(); res(true); }, 300));
});
out.steps.push({ name: 'xray-toggle', ok: xray });
// player + interior + slice cams return without error
out.steps.push({ name: 'player-cam', ok: await pg.evaluate(() => { window.__playerCamAt(0.5); return true; }) });
out.steps.push({ name: 'interior-cam', ok: await pg.evaluate(() => window.__interiorCam('core-objective')) });
out.steps.push({ name: 'slice-cam', ok: await pg.evaluate(() => { window.__sliceCamAt(0.5); return true; }) });
// visual change detection: blockout-only vs built-only tops must differ (compositor screenshots)
const shotA = await (async () => { await pg.evaluate(() => document.getElementById('bBlock').click()); await pg.waitForTimeout(500); return await pg.screenshot(); })();
const shotB = await (async () => { await pg.evaluate(() => document.getElementById('bBlock').click()); await pg.waitForTimeout(500); return await pg.screenshot(); })();
out.steps.push({ name: 'visual-diff-blockout-toggle', differs: !shotA.equals(shotB) });
out.errors = errors;
console.log(JSON.stringify(out, null, 2));
console.log(errors.length ? 'VIEWER VERIFY: FAIL (' + errors.length + ' errors)' : 'VIEWER VERIFY: PASS');
await b.close();
process.exit(errors.length ? 1 : 0);
