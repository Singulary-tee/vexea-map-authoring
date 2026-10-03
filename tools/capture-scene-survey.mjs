#!/usr/bin/env node
// Scene survey capture: renders labeled views of the authoring-demo slice from the
// object-overlay GLB (swiftshader recipe, same as capture_viewer.mjs).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 3721;
const glb = process.argv[2] || '.context/ab/authoring-demo/overlay.glb';
const outDir = process.argv[3] || 'artifacts/scene-survey';
fs.mkdirSync(outDir, { recursive: true });
const VIEWS = [
  { name: 'approach', pos: '-176,1.4,-8', look: '-176,5,59', fov: 55 },
  { name: 'window-row-front', pos: '-181,3.4,30', look: '-168,4.6,59', fov: 60 },
  { name: 'window-row-close', pos: '-206,2.4,44', look: '-150,4.8,59', fov: 55 },
  { name: 'yard-pods', pos: '-206,1.6,20', look: '-172,1.6,40', fov: 60 },
  { name: 'slice-iso', pos: '-268,74,-28', look: '-172,4,55', fov: 45 },
  { name: 'slice-top', pos: '-176,150,10', look: '-176,0,46', fov: 42 },
];
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
try {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
  const page = await b.newPage({ viewport: { width: 900, height: 560 } });
  for (const v of VIEWS) {
    const p = `${outDir}/${v.name}.png`;
    await page.goto(`http://localhost:${PORT}/editor/slice-viewer.html?glb=/${glb}&pos=${v.pos}&look=${v.look}&fov=${v.fov}`, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.__sliceReady === true', null, { timeout: 60000 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: p });
    console.log('captured', v.name);
  }
  await b.close();
} finally {
  server.kill();
}
