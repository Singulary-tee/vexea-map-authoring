#!/usr/bin/env node
// Zone-warehouse survey capture: canonical survey camera + yard streetlight views
// from the object-overlay GLB (swiftshader recipe, same as capture-scene-survey.mjs).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 3723;
const glb = process.argv[2] || '.context/ab/authoring-demo/overlay.glb';
const outDir = process.argv[3] || 'artifacts/warehouse-quality';
fs.mkdirSync(outDir, { recursive: true });
const VIEWS = [
  { name: 'warehouse-canonical', pos: '-164,1.7,34', look: '-118,5,-10', fov: 55 },
  { name: 'warehouse-yard-lights', pos: '-140,1.7,-8', look: '-132,4,-45', fov: 62 },
  { name: 'warehouse-light-clean-close', pos: '-151,1.7,-35', look: '-160,4.5,-44', fov: 50 },
  { name: 'warehouse-light-weathered-close', pos: '-95,1.7,-36', look: '-104,4.5,-46', fov: 50 },
];
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
try {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
  const page = await b.newPage({ viewport: { width: 900, height: 560 } });
  for (const v of VIEWS) {
    const p = `${outDir}/${v.name}.png`;
    await page.goto(`http://localhost:${PORT}/editor/slice-viewer.html?glb=/${glb}&pos=${v.pos}&look=${v.look}&fov=${v.fov}`, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.__sliceReady === true', null, { timeout: 120000 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: p });
    console.log('captured', v.name);
  }
  // object inspection: what passes the gate (rich streetlight, clean + weathering)
  const page2 = await b.newPage({ viewport: { width: 900, height: 640 } });
  for (const variant of ['', '&variant=dusty']) {
    const name = variant ? 'streetlight-variant-weathered' : 'streetlight-clean';
    const p = `${outDir}/${name}.png`;
    await page2.goto(`http://localhost:${PORT}/editor/object-inspector.html?obj=obj_prop_streetlight_rich${variant}&view=iso&dist=mid`, { waitUntil: 'networkidle' });
    await page2.waitForFunction('window.__inspectorReady === true', null, { timeout: 60000 });
    await page2.waitForTimeout(250);
    await page2.screenshot({ path: p });
    console.log('captured', name);
  }
  await b.close();
} finally {
  server.kill();
}
