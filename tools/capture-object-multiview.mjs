#!/usr/bin/env node
// Multiview object inspection: renders each authored object in authoring/objects/
// as front/side/rear/iso x near/mid/far + variant row, via playwright + swiftshader
// (same recipe as capture_viewer.mjs). Writes artifacts/objects/<id>-*.png, gates them
// with tools/analyze-survey-png.mjs, and records evidence into the object docs.
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const PORT = 3719;
const outDir = 'artifacts/objects';
fs.mkdirSync(outDir, { recursive: true });
const objects = fs.readdirSync('authoring/objects').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`authoring/objects/${f}`, 'utf8')));
const only = process.argv[2];
const targets = only ? objects.filter(o => o.id === only || o.type === only) : objects;
if (!targets.length) { console.error('no objects match', only); process.exit(2); }

const server = spawn('python3', ['-m', 'http.server', String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
const sha256 = v => createHash('sha256').update(v).digest('hex');
const evidence = [];
try {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--in-process-gpu', '--no-sandbox'] });
  const page = await b.newPage({ viewport: { width: 900, height: 640 } });
  for (const obj of targets) {
    const views = [];
    for (const view of ['front', 'side', 'rear', 'iso']) {
      for (const dist of ['near', 'mid', 'far']) {
        const path = `${outDir}/${obj.id}-${view}-${dist}.png`;
        await page.goto(`http://localhost:${PORT}/editor/object-inspector.html?obj=${obj.id}&view=${view}&dist=${dist}`, { waitUntil: 'networkidle' });
        await page.waitForFunction('window.__inspectorReady === true', null, { timeout: 15000 });
        await page.screenshot({ path });
        views.push({ view, dist, path, sha256: sha256(fs.readFileSync(path)) });
      }
    }
    for (const variant of obj.variants) {
      const path = `${outDir}/${obj.id}-variant-${variant.id}.png`;
      await page.goto(`http://localhost:${PORT}/editor/object-inspector.html?obj=${obj.id}&variant=${variant.id}&view=iso&dist=mid`, { waitUntil: 'networkidle' });
      await page.waitForFunction('window.__inspectorReady === true', null, { timeout: 15000 });
      await page.screenshot({ path });
      views.push({ view: `variant:${variant.id}`, dist: 'iso', path, sha256: sha256(fs.readFileSync(path)) });
    }
    evidence.push({ object: obj.id, views });
    console.log(`captured ${obj.id}: ${views.length} views`);
  }
  await b.close();
} finally {
  server.kill();
}

// render gate: reuse the repo's analyzer (mass/contrast on non-sky background)
const gate = execFileSync('node', ['tools/analyze-survey-png.mjs', '--expected-width', '900', '--expected-height', '640', '--background', '42,52,61', outDir], { encoding: 'utf8' });
console.log(gate.trim());

// record evidence into object docs (content sha changes -> integrated instances go stale by design)
for (const ev of evidence) {
  const p = `authoring/objects/${ev.object}.json`;
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  obj.evidence = { mechanism: 'tools/capture-object-multiview.mjs', captured: new Date().toISOString().slice(0, 10), views: ev.views, gate: 'analyze-survey-png' };
  obj.revision += 1;
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}
console.log('evidence recorded into', evidence.map(e => e.object).join(', '));
