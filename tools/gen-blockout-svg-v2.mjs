#!/usr/bin/env node
// gen-blockout-svg-v2.mjs — top-down orthographic SVG of a v0.2 blockout
// (zones tinted, buildings solid, routes as lines, cameras as dots). VM-safe, no deps.
// Usage: node tools/gen-blockout-svg-v2.mjs [blockout-v2.json] [out.svg]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] ?? 'blockout/blockout-v2.json';
const dst = process.argv[3] ?? 'out/blockout-v2.svg';
const b = JSON.parse(readFileSync(join(root, src), 'utf8'));
const THREAT = ['#20313a', '#24403a', '#3a4024', '#4a3a24', '#4a2424', '#5a1f1f']; // threat 0-5 tint
const RCOL = { surface: '#d99a2b', covered: '#b97a1e', tunnel: '#9a5ae0' };
const W = b.world, PAD = 30;
const SW = W.xMax - W.xMin, SH = W.zMax - W.zMin;
const X = v => PAD + (v - W.xMin), Y = v => PAD + (SH - (v - W.zMin)); // north up
const p = [`<svg xmlns="http://www.w3.org/2000/svg" width="${SW + 2 * PAD}" height="${SH + 2 * PAD + 40}" viewBox="0 0 ${SW + 2 * PAD} ${SH + 2 * PAD + 40}">`,
`<rect width="100%" height="100%" fill="#101316"/>`];
// zones (tint by threat)
for (const z of b.zones ?? []) {
  const [a, c, d, e] = z.bounds;
  p.push(`<rect x="${X(a)}" y="${Y(e)}" width="${c - a}" height="${e - d}" fill="${THREAT[z.threat] ?? '#333'}" stroke="#3a4a55" stroke-width="1.5" opacity="0.9"/>`);
  if ((c - a) > 60 && (e - d) > 24) p.push(`<text x="${X(a) + 6}" y="${Y(e) + 16}" fill="#cfd8dc" font-family="monospace" font-size="12">${z.name}</text>`);
  if (z.droneSpawn) p.push(`<circle cx="${X((a + c) / 2)}" cy="${Y((d + e) / 2)}" r="7" fill="none" stroke="#5ac8e0" stroke-width="2"/><text x="${X((a + c) / 2) - 5}" y="${Y((d + e) / 2) + 5}" fill="#5ac8e0" font-size="11" font-family="monospace">D</text>`);
  if (z.killZone) p.push(`<rect x="${X(a) + 3}" y="${Y(e) + 3}" width="${c - a - 6}" height="${e - d - 6}" fill="none" stroke="#e05a4a" stroke-width="2" stroke-dasharray="6 4"/>`);
}
// buildings (solid, darker outline)
for (const bl of b.buildings ?? []) {
  const [a, c, d, e] = bl.footprint;
  const fill = bl.category === 'facade-non-enterable' ? '#6a6f74' : '#8a9199';
  p.push(`<rect x="${X(a)}" y="${Y(e)}" width="${c - a}" height="${e - d}" fill="${fill}" stroke="#111" stroke-width="1.5"/>`);
}
// routes
for (const r of b.routes ?? []) {
  const pts = r.points.map(q => `${X(q[0])},${Y(q[1])}`).join(' ');
  p.push(`<polyline points="${pts}" fill="none" stroke="${RCOL[r.kind]}" stroke-width="${Math.max(2, r.width / 2)}" ${r.kind === 'tunnel' ? 'stroke-dasharray="10 6"' : ''} opacity="0.85"/>`);
}
// cameras
for (const cam of b.surveillance ?? []) {
  p.push(`<rect x="${X(cam.pos[0]) - 5}" y="${Y(cam.pos[1]) - 5}" width="10" height="10" fill="#5ac8e0" stroke="#0a3a4a"/>`);
}
// legend
p.push(`<text x="${PAD}" y="${SH + 2 * PAD + 14}" fill="#889" font-family="monospace" font-size="12">${b.map} | ${b.zones.length} zones | ${b.buildings.length} buildings | D=drone spawn | red dash=kill zone | solid=building | orange=surface route | dark orange=covered | purple=tunnel (below grade) | cyan=surveillance</text></svg>`);
mkdirSync(join(root, 'out'), { recursive: true });
writeFileSync(join(root, dst), p.join(''));
console.log('wrote', dst, `(${b.zones.length} zones, ${b.buildings.length} buildings, ${(b.routes ?? []).length} routes)`);