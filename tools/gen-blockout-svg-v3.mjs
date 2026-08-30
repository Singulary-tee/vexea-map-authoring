#!/usr/bin/env node
// Render blockout-v3 to top-down SVG (north up, X east). Grounded routes only.
import fs from 'node:fs';
const b = JSON.parse(fs.readFileSync(process.argv[2] || 'blockout/blockout-v3.json', 'utf8'));
const W = b.meta.world;
const sx = 1400 / (W.maxX - W.minX), sz = 1000 / (W.maxZ - W.minZ);
const X = (x) => +((x - W.minX) * sx).toFixed(1);
const Y = (z) => +((W.maxZ - z) * sz).toFixed(1);
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1000" font-family="monospace">
<rect width="1400" height="1000" fill="#10151b"/>`;
// water edge polygon (east/south)
if (b.terrain?.waterEdge) {
  const pts = b.terrain.waterEdge.map(p => `${X(p[0])},${Y(p[1])}`).join(' ');
  s += `<polygon points="${pts} 1400,0 1400,1000" fill="#12324a" opacity="0.55"/>`;
}
// grid
for (let x = W.minX; x <= W.maxX; x += 100) s += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="1000" stroke="#1b2733" stroke-width="1"/>`;
for (let z = W.minZ; z <= W.maxZ; z += 100) s += `<line x1="0" y1="${Y(z)}" x2="1400" y2="${Y(z)}" stroke="#1b2733" stroke-width="1"/>`;
// structures
for (const bld of b.structures) {
  const w = bld.w * sx, d = bld.d * sz;
  const x = X(bld.x - bld.w / 2), y = Y(bld.z + bld.d / 2);
  const fill = bld.enterable ? '#3a4a5c' : '#2a3644';
  const stroke = bld.id === 'coreOpsHall' ? '#e05555' : '#7f96ad';
  s += `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${d.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="2" rx="2"/>`;
  if (bld.h > 0) s += `<text x="${X(bld.x)}" y="${(parseFloat(y) + 12).toFixed(1)}" fill="#9fb4c9" font-size="10" text-anchor="middle">${bld.name.split(' ')[0]} ${bld.floors ? bld.floors + 'F' : ''}</text>`;
}
// routes
const rc = { ground: '#e8a33d', covered: '#e8a33d' };
for (const r of b.routes) {
  const pts = r.waypoints.map(p => `${X(p[0])},${Y(p[1])}`).join(' ');
  const dash = r.kind === 'covered' ? 'stroke-dasharray="8 5"' : r.kind === 'tunnel' ? 'stroke-dasharray="4 4" stroke="#b06ee8"' : '';
  const col = r.kind === 'tunnel' ? '#b06ee8' : rc[r.kind];
  s += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="3" ${dash} opacity="0.9"/>`;
}
// tunnel
for (const v of (b.vertical || []).filter(v => v.type === 'belowGrade')) {
  const pts = v.waypoints.map(p => `${X(p[0])},${Y(p[1])}`).join(' ');
  s += `<polyline points="${pts}" fill="none" stroke="#b06ee8" stroke-width="4" stroke-dasharray="6 4" opacity="0.8"/>`;
}
// kills
for (const k of b.kills) s += `<circle cx="${X(k.x)}" cy="${Y(k.z)}" r="${(k.r * sx).toFixed(1)}" fill="#e05555" opacity="0.15" stroke="#e05555" stroke-width="2"/>`;
// destructibles
for (const d of b.destructibles) s += `<rect x="${(X(d.x) - 6)}" y="${(Y(d.z) - 6)}" width="12" height="12" fill="#4ac0e8" rx="2"/>`;
// spawn
s += `<polygon points="${X(b.spawn.x)},${(Y(b.spawn.z) - 14).toFixed(1)} ${(X(b.spawn.x) - 10).toFixed(1)},${(Y(b.spawn.z) + 8).toFixed(1)} ${(X(b.spawn.x) + 10).toFixed(1)},${(Y(b.spawn.z) + 8).toFixed(1)}" fill="#66d17a"/>`;
s += `<text x="${X(b.spawn.x)}" y="${Y(b.spawn.z) + 26}" fill="#66d17a" font-size="12" text-anchor="middle">SPAWN</text>`;
s += `<text x="20" y="30" fill="#7f96ad" font-size="16">facility-v3 — from user target map · grounded routes · ${b.structures.length} structures</text></svg>\n`;
fs.writeFileSync('editor/blockout-v3.svg', s);
console.log('wrote editor/blockout-v3.svg', s.length, 'bytes');
