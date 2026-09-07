// Measure rendered performance of the built campus (top ortho + orbit + player views).
// Records avg frame time over 90 frames per view + draw-call/tri counts from the build report.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const local = new URL('../node_modules/', import.meta.url).pathname;
const require = createRequire(existsSync(local) ? local : '/workspaces/vexea-international/node_modules/');
const { chromium } = require('playwright');
import { readFileSync, writeFileSync } from 'node:fs';
const build = JSON.parse(readFileSync('out/build-report.json', 'utf8'));

const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
await pg.goto('http://127.0.0.1:3000/editor/blockout-viewer.html');
await pg.waitForFunction('window.__ready === true', null, { timeout: 20000 });
const measure = async (label, setup) => {
  await pg.evaluate(setup);
  await pg.waitForTimeout(400);
  const ft = await pg.evaluate(() => new Promise(res => {
    let n = 0, t0 = performance.now();
    const step = () => { n++; if (n < 90) requestAnimationFrame(step); else res((performance.now() - t0) / n); };
    requestAnimationFrame(step);
  }));
  console.log(label, 'avg frame ms', ft.toFixed(2), '=>', (1000 / ft).toFixed(0), 'fps (software GL)');
  return { view: label, avgFrameMs: +ft.toFixed(2) };
};
const views = [];
views.push(await measure('top-ortho', () => { document.getElementById('bTop').click(); }));
views.push(await measure('orbit-persp', () => { document.getElementById('bOrbit').click(); }));
views.push(await measure('xray-top', () => { document.getElementById('bTop').click(); document.getElementById('bXray').click(); }));
await pg.evaluate(() => document.getElementById('bXray').click());
views.push(await measure('player-route', () => window.__playerCamAt(0.5)));
const report = {
  renderer: 'WebGL2 (swiftshader software GL, headless measurement)',
  materials: build.materials, triangles: build.triangles,
  drawItems: build.materials, segments: build.segments,
  glbBytes: require('node:fs').statSync('editor/facility-built.glb').size,
  blockoutLayerBytes: require('node:fs').statSync('editor/blockout-full.glb').size,
  views, note: 'software-GL frame times are a lower bound on GPU-class hardware; draw items = merged per-material meshes',
};
writeFileSync('out/perf-report.json', JSON.stringify(report, null, 2));
console.log('perf report written:', views.map(v => v.view + ' ' + v.avgFrameMs + 'ms').join(' | '));
await b.close();
