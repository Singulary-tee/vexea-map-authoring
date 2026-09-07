#!/usr/bin/env node
// gen-blockout-svg-full: full-map blockout -> top-down SVG (north up, X east), color-coded by
// category with labels, routes, kill zones, spawn, scale bar (1.8m fixture figure) and legend.
import fs from 'node:fs';
const file = process.argv[2] ?? 'blockout/blockout-full-v1.json';
const out = process.argv[3] ?? 'out/blockout-full-v1.svg';
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const W = b.meta.world;
const WX = W.maxX - W.minX, WZ = W.maxZ - W.minZ;
const VW = 1500, VH = Math.round(VW * WZ / WX);
const sx = VW / WX, sz = VH / WZ;
const X = x => +((x - W.minX) * sx).toFixed(1);
const Y = z => +((W.maxZ - z) * sz).toFixed(1);
// category palette (fill, stroke) — color coding per stage prompt
const P = {
  'ground-surface-type': ['#5f5c4e', '#7d7866'],
  'building-enterable': ['#3a5a7c', '#8fa8c0'],
  'warehouse-enterable': ['#46688c', '#9db4c9'],
  'facade-non-enterable': ['#4a5560', '#77828d'],
  'tower': ['#5b4a8c', '#a08fd0'],
  'bridge': ['#2e8c8c', '#7fd0c0'],
  'wall-blocking': ['#7a6a4a', '#a09070'],
  'stair': ['#c07a2e', '#e8b060'],
  'incline': ['#d08a3a', '#f0c080'],
  'tunnel-passage': ['#8a5ab8', '#c8a0f0'],
  'hole-drone-entry': ['#d84a8c', '#f090c0'],
  'entrance-player': ['#e0c040', '#f8e8a0'],
  'cover': ['#3f7a45', '#7fba8a'],
  'overhead-cover': ['#5a9a5a', '#a0d8a0'],
  'mountain-boundary': ['#5a4a3a', '#80705a'],
  'waterbody-boundary': ['#2e5d7a', '#5a90b8'],
  'spawn': ['#40c0c0', '#a0f0f0'],
  'kill-zone': ['#d04040', '#f09090'],
  'roll-down': ['#b06030', '#e0a060'],
};
// ground surface classes get their own fill so yards/roads read distinctly
const SURF = { concrete: '#7a7668', asphalt: '#5f5c4e', gravel: '#6e6a5a', dirt: '#6a5f4e' };
const dash = { 'tunnel-passage': 'stroke-dasharray="3 4"', 'hole-drone-entry': 'stroke-dasharray="5 3"' };
let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}" font-family="monospace">
<rect width="${VW}" height="${VH}" fill="#10151b"/>`;
// water body along terrain.waterEdge polyline (closes east/south)
if (b.terrain?.waterEdge) {
  const pts = [...b.terrain.waterEdge.map(p => `${X(p[0])},${Y(p[1])}`), `${VW},${Y(b.terrain.waterEdge[0][1])}`, `${VW},${VH}`, `0,${VH}`].join(' ');
  s += `<polygon points="${pts}" fill="#12324a" opacity="0.85"/>`;
}
// grid 100m
for (let x = Math.ceil(W.minX / 100) * 100; x <= W.maxX; x += 100) s += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${VH}" stroke="#1b2733" stroke-width="1"/>`;
for (let z = Math.ceil(W.minZ / 100) * 100; z <= W.maxZ; z += 100) s += `<line x1="0" y1="${Y(z)}" x2="${VW}" y2="${Y(z)}" stroke="#1b2733" stroke-width="1"/>`;
// segments (kill zones + grounds first so structures read on top)
const order = k => ['ground-surface-type', 'kill-zone'].indexOf(k) === -1 ? 1 : 0;
for (const seg of [...b.segments].sort((a, c) => order(a.category) - order(c.category))) {
  const [x1, z1, x2, z2] = seg.bounds;
  const rx = X(x1), ry = Y(z2), rw = (x2 - x1) * sx, rh = (z2 - z1) * sz;
  let [f, st] = P[seg.category] || ['#333', '#666'];
  if (seg.category === 'ground-surface-type') f = SURF[seg.surface] || f;
  const op = seg.category === 'kill-zone' ? '0.35' : seg.category === 'overhead-cover' ? '0.5' : seg.category === 'waterbody-boundary' ? '0.9' : '1';
  let extra = '';
  if (seg.category === 'kill-zone') extra = ' stroke-dasharray="8 6"';
  if (seg.category === 'tunnel-passage') extra = ' stroke-dasharray="4 4"';
  s += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${f}" fill-opacity="${op}" stroke="${st}" stroke-width="${seg.category === 'kill-zone' ? 2 : 1.2}"${extra} rx="1"/>`;
}
// routes
const RC = { ground: '#e8a33d', covered: '#e8c34d', tunnel: '#b06ee8', air: '#59d0d0' };
for (const r of b.routes) {
  const pts = r.waypoints.map(p => `${X(p[0])},${Y(p[1])}`).join(' ');
  const col = RC[r.kind] || RC.ground;
  const dd = r.kind === 'covered' ? 'stroke-dasharray="9 5"' : r.kind === 'tunnel' ? 'stroke-dasharray="4 4"' : r.kind === 'air' ? 'stroke-dasharray="2 6"' : '';
  const w = r.kind === 'air' ? 1.5 : 2.5 + (r.width || 6) * 0.08;
  s += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}" ${dd} opacity="0.85"/>`;
}
// spawn + kills + destructibles
const sp = b.spawn || {};
s += `<circle cx="${X(sp.x)}" cy="${Y(sp.z)}" r="6" fill="none" stroke="#40c0c0" stroke-width="2"/>
<circle cx="${X(sp.x)}" cy="${Y(sp.z)}" r="40" fill="#40c0c0" opacity="0.08"/>`;
for (const k of b.kills) s += `<circle cx="${X(k.x)}" cy="${Y(k.z)}" r="${(k.r * sx).toFixed(1)}" fill="none" stroke="#d04040" stroke-width="2" stroke-dasharray="6 4" opacity="0.8"/>`;
for (const d of b.destructibles || []) s += `<circle cx="${X(d.x)}" cy="${Y(d.z)}" r="3" fill="#e8e34d"/>`;
// labels: buildings, tunnels, covers (small), spawn, reservoir
const label = (x, y, txt, size = 10, fill = '#9fb4c9') =>
  `<text x="${X(x).toFixed(1)}" y="${(Y(y) + 4).toFixed(1)}" fill="${fill}" font-size="${size}" text-anchor="middle">${txt}</text>`;
for (const seg of b.segments) {
  const cx = (seg.bounds[0] + seg.bounds[2]) / 2, cz = (seg.bounds[1] + seg.bounds[3]) / 2;
  if (['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower'].includes(seg.category)) {
    const nm = seg.name.replace(', 2 floors', '').replace(', 5 floors', '').replace(', 6 floors', '').replace(', 1 floor', '');
    const short = nm.split(' ').slice(0, 2).join(' ');
    s += label(cx, cz, `${short}${seg.floors ? ' ' + seg.floors + 'F' : ''}`, 11);
  } else if (seg.category === 'tunnel-passage' && seg.name.includes('arm')) {
    s += label(cx, cz, seg.name.split(' ')[2], 9, '#c8a0f0');
  } else if (seg.category === 'hole-drone-entry' || seg.category === 'bridge' || seg.category === 'incline') {
    s += label(cx, cz, seg.name, 9, '#f0d090');
  } else if (seg.category === 'cover' && seg.id.startsWith('cv-court')) {
    s += label(cx + 0, cz + 2, 'barr', 8, '#7fba8a');
  }
}
s += label(sp.x, sp.z + 10, 'SPAWN', 10, '#a0f0f0');
s += label(sp.x, sp.z - 10, 'safe apron', 8, '#80b0b0');
const res = b.terrain?.reservoir || {};
s += label(res.center?.[0] ?? 430, res.center?.[1] ?? 40, res.label || 'reservoir', 10, '#5a90b8');
s += label(0, W.maxZ - 20, 'N', 12, '#c8c8c8');
s += `<text x="${X(0)}" y="${Y(W.maxZ) - 6}" fill="#c8c8c8" font-size="12" text-anchor="middle">▲</text>`;
// scale bar + fixture figure (1.8m capsule) + legend
s += `<g transform="translate(20,${VH - 14})"><rect x="0" y="-8" width="${(100 * sx).toFixed(0)}" height="4" fill="#c8c8c8"/>
<text x="${(50 * sx).toFixed(0)}" y="-12" fill="#c8c8c8" font-size="9" text-anchor="middle">100 m</text></g>`;
const legend = [['ground-surface-type', 'ground/surface'], ['building-enterable', 'enterable building'], ['warehouse-enterable', 'warehouse'], ['facade-non-enterable', 'non-enterable shell'], ['tower', 'tower/overwatch'], ['bridge', 'bridge'], ['wall-blocking', 'wall/fence'], ['stair', 'stair'], ['incline', 'incline 1:12'], ['roll-down', 'roll-down door'], ['tunnel-passage', 'tunnel (X-ray)'], ['hole-drone-entry', 'drone hole'], ['entrance-player', 'entrance'], ['cover', 'cover'], ['overhead-cover', 'overhead canopy'], ['mountain-boundary', 'mountain'], ['waterbody-boundary', 'water'], ['spawn', 'spawn'], ['kill-zone', 'kill zone']];
const lx = VW - 190, ly = 20;
s += `<g transform="translate(${lx},${ly})"><rect x="-8" y="-10" width="196" height="${legend.length * 15 + 14}" fill="#0c1116" opacity="0.9" rx="3"/>`;
legend.forEach(([k, nm], i) => {
  const [f] = P[k];
  s += `<rect x="0" y="${i * 15}" width="11" height="11" fill="${f}" stroke="#888" stroke-width="0.5"/><text x="18" y="${i * 15 + 10}" fill="#b8c4d0" font-size="9">${nm}</text>`;
});
s += `</g>`;
// route legend
s += `<g transform="translate(${lx},${ly + legend.length * 15 + 12})"><rect x="-8" y="-10" width="196" height="58" fill="#0c1116" opacity="0.9" rx="3"/>`;
[['#e8a33d', 'ground route', ''], ['#e8c34d', 'covered route', 'stroke-dasharray="9 5"'], ['#b06ee8', 'tunnel route', 'stroke-dasharray="4 4"'], ['#59d0d0', 'air lane', 'stroke-dasharray="2 6"']].forEach(([c, nm, dd], i) => {
  s += `<line x1="0" y1="${i * 13 + 4}" x2="16" y2="${i * 13 + 4}" stroke="${c}" stroke-width="2" ${dd}/><text x="24" y="${i * 13 + 8}" fill="#b8c4d0" font-size="9">${nm}</text>`;
});
s += '</g>';
s += '</svg>';
fs.writeFileSync(out, s);
console.log('wrote', out, s.length, 'bytes');
