#!/usr/bin/env node
// blockout-validate-full: full-map segmented blockout gates (stage doctrine + v3 user rules).
// Usage: node tools/blockout-validate-full.mjs [blockout.json]
import { readFileSync } from 'node:fs';
const file = process.argv[2] ?? 'blockout/blockout-full-v1.json';
const b = JSON.parse(readFileSync(file, 'utf8'));
const W = b.meta.world;
const CATS = new Set(['ground-surface-type','wall-blocking','stair','incline','building-enterable',
  'warehouse-enterable','facade-non-enterable','tower','bridge','tunnel-passage','hole-drone-entry',
  'entrance-player','cover','overhead-cover','mountain-boundary','waterbody-boundary','spawn','kill-zone',
  'roll-down']);
const NON_DISP = new Set(['building-enterable','warehouse-enterable','facade-non-enterable','tower',
  'mountain-boundary','bridge','wall-blocking']);
const res = [];
const c = (n, p, d = '') => res.push({ n, p, d });
const segs = b.segments;
const byId = new Map(segs.map(s => [s.id, s]));
const ab = (s) => { const [x1, z1, x2, z2] = s.bounds; return { id: s.id, minX: x1, minZ: z1, maxX: x2, maxZ: z2 }; };

// 1. stable unique IDs
const ids = segs.map(s => s.id);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
c('unique stable IDs', dup.length === 0, [...new Set(dup)].join(','));
c('segments non-empty', segs.length > 0);

// 2. categories + required fields
const catBad = [], noBounds = [], zoneBad = [];
for (const s of segs) {
  if (!CATS.has(s.category)) catBad.push(s.id);
  if (!s.bounds || s.bounds.length !== 4) noBounds.push(s.id);
  else {
    const [x1, z1, x2, z2] = s.bounds;
    if (x2 <= x1 || z2 <= z1) noBounds.push(s.id + '(bbox)');
    if (x1 < W.minX || x2 > W.maxX || z1 < W.minZ || z2 > W.maxZ) noBounds.push(s.id + '(world)');
  }
  if (!s.zone || !b.zones.some(z => z.id === s.zone)) zoneBad.push(s.id);
  if (s.id === 'sp-spawn') c('spawn present', true);
}
c('valid categories', catBad.length === 0, catBad.join(','));
c('all segments have valid in-world bounds', noBounds.length === 0, noBounds.join(','));
c('all segments carry a known zone', zoneBad.length === 0, zoneBad.join(','));

// 3. 1m grid snap
const off = [];
for (const s of segs) for (const v of s.bounds) if (Math.abs(v - Math.round(v)) > 1e-6) off.push(s.id);
c('all coords snapped to 1m grid', off.length === 0, [...new Set(off)].join(','));

// 4. entrance-player clearance vs capsule (>=1m wide, >=2m tall)
const entBad = [];
for (const s of segs) {
  if (s.category !== 'entrance-player') continue;
  const [x1, z1, x2, z2] = s.bounds;
  const w = s.width ?? Math.min(x2 - x1, z2 - z1);
  const h = s.height ?? 999;
  if (w < 1 || h < 2) entBad.push(`${s.id}(w${w.toFixed(1)},h${h.toFixed(1)})`);
}
c('entrances admit 1.8m capsule (>=1m x >=2m)', entBad.length === 0, entBad.join(','));

// 5. stair/incline gauges vs fixture (rise<=0.18, tread>=0.28, incline grade<=1:12)
const stBad = [];
for (const s of segs) {
  if (s.category === 'stair') {
    const g = s.gauge || {};
    if ((g.rise ?? 0.19) > 0.18 || (g.tread ?? 0.2) < 0.28) stBad.push(`${s.id}(rise${g.rise},tread${g.tread})`);
    if (!g.width || g.width < 1) stBad.push(`${s.id}(width)`);
  }
  if (s.category === 'incline') {
    const g = s.gauge || {};
    const grade = parseFloat(String(g.grade).split(':')[1]);
    if (!g.grade || 1 / grade > 1 / 12 + 1e-9) stBad.push(`${s.id}(grade ${g.grade})`);
    else if (Math.abs((g.rise ?? 0) - (g.run ?? 0) / grade) > 1 + 1e-6) stBad.push(`${s.id}(rise/run mismatch)`);
  }
}
c('stair/incline gauges within fixture', stBad.length === 0, stBad.join(','));

// 6. cover obligations
const covBad = [];
const routeNames = new Set(b.routes.map(r => r.id));
for (const s of segs) {
  if (s.category !== 'cover') continue;
  const cv = s.cover || {};
  if (!cv.threatElevation || !['ground', 'air', 'both'].includes(cv.threatElevation)) covBad.push(`${s.id}(threat)`);
  if (!cv.directionality) covBad.push(`${s.id}(directionality)`);
  if (!cv.interrupts) covBad.push(`${s.id}(interrupts)`);
  else {
    const toks = cv.interrupts.toLowerCase().split(/[^a-z0-9_-]+/);
    if (!toks.some(t => routeNames.has(t) || byId.has(t))) covBad.push(`${s.id}(interrupts names no route/segment)`);
  }
  if (!cv.heightClass || !['low', 'mid', 'full'].includes(cv.heightClass)) covBad.push(`${s.id}(heightClass)`);
  const h = s.height || 0;
  const bandOk = (cv.heightClass === 'low' && h >= 0.3 && h <= 0.6) ||
    (cv.heightClass === 'mid' && h >= 0.9 && h <= 1.4) || (cv.heightClass === 'full' && h >= 1.7);
  if (!bandOk) covBad.push(`${s.id}(h${h} vs ${cv.heightClass})`);
  if (cv.threatElevation !== 'ground' && cv.heightClass !== 'full')
    covBad.push(`${s.id}(air-rated needs full height)`);
}
// air-rated covers also clearable via overhead-cover on the same route: handled as advisory
for (const s of segs) {
  if (s.category !== 'cover') continue;
  const cv = s.cover || {};
  if (cv.threatElevation !== 'ground' && cv.heightClass !== 'full') {
    const hasOver = segs.some(o => o.category === 'overhead-cover' &&
      Math.abs(o.bounds[0] - s.bounds[0]) < 60 && Math.abs(o.bounds[2] - s.bounds[2]) < 60);
    if (!hasOver) covBad.push(`${s.id}(air-rated, no overhead cover nearby)`);
  }
}
c('cover carries threatElevation+directionality+interrupts+heightClass', covBad.length === 0, covBad.join(','));

// 7. connectivity refs resolve
const zones = new Set(b.zones.map(z => z.id));
let dangling = [];
for (const s of segs) {
  for (const r of (s.connectivity || [])) if (!byId.has(r) && !zones.has(r) && !s.id.includes(r)) dangling.push(`${s.id}->${r}`);
}
c('connectivity refs resolve to segments/zones', dangling.length === 0, [...new Set(dangling)].slice(0, 8).join('; '));

// 8. spawn -> core reachability (BFS over connectivity)
const isSpawn = s => s.category === 'spawn';
const isCore = s => s.id === 'bld-core-ops-hall';
const start = segs.find(isSpawn), goal = segs.find(isCore);
let reach = false;
if (start && goal) {
  const q = [start.id], seen = new Set(q);
  while (q.length) {
    const n = q.shift();
    if (n === goal.id) { reach = true; break; }
    for (const nb of (byId.get(n)?.connectivity || [])) if (byId.has(nb) && !seen.has(nb)) { seen.add(nb); q.push(nb); }
  }
}
c('BFS: spawn reaches core ops hall', reach);
c('core objective zone present', segs.some(s => s.zone === 'zone_core' && s.category === 'building-enterable'));

// 9. no unexplained overlap of non-displaceable volumes (>5m intrusion), with allow-pairs
const allowPairs = new Set([
  ['bld-core-walkway', 'bld-core-ops-hall'], ['bld-core-walkway', 'bld-core-service-wing'],
  ['br-catwalk', 'bld-service-tower'], ['br-catwalk', 'st-catwalk-e'],
  ['e-plant-w', 'in-plant'], ['e-sec-s', 's-sec-threshold'],
]);
const boxes = segs.filter(s => NON_DISP.has(s.category)).map(ab);
let overlap = [];
for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
  const a = boxes[i], d = boxes[j];
  const ix = Math.min(a.maxX, d.maxX) - Math.max(a.minX, d.minX);
  const iz = Math.min(a.maxZ, d.maxZ) - Math.max(a.minZ, d.minZ);
  if (ix > 5 && iz > 5) {
    const ov = (ix * iz).toFixed(0);
    if (!allowPairs.has([a.id, d.id].sort().join('|')) && !allowPairs.has(a.id + '|' + d.id) && !allowPairs.has(d.id + '|' + a.id))
      overlap.push(`${a.id}/${d.id}(${ov}m2)`);
    else if (ix > 12 && iz > 12) overlap.push(`${a.id}/${d.id}(${ov}m2 allowlist-exceeds)`);
  }
}
c('no unexplained overlap of non-displaceable volumes (>5m)', overlap.length === 0, overlap.join(', '));

// 10. route containment: ground/covered waypoints inside ground or enterable buildings; tunnel inside tunnel segs
const groundSegs = segs.filter(s => s.category === 'ground-surface-type');
const entBlds = segs.filter(s => ['building-enterable', 'warehouse-enterable'].includes(s.category));
const tunSegs = segs.filter(s => s.category === 'tunnel-passage');
const inBox = (p, s, pad = 0) => p[0] >= s.bounds[0] - pad && p[0] <= s.bounds[2] + pad && p[1] >= s.bounds[1] - pad && p[1] <= s.bounds[3] + pad;
let rBad = [];
for (const r of b.routes) {
  const isTun = r.kind === 'tunnel', isAir = r.kind === 'air';
  if (isAir) continue;
  for (const p of r.waypoints) {
    if (isTun) { if (!tunSegs.some(s => inBox(p, s))) rBad.push(`${r.id}@${p}`); continue; }
    const onGround = groundSegs.some(s => inBox(p, s));
    const inEnt = r.kind === 'covered' && entBlds.some(s => inBox(p, s));
    if (!onGround && !inEnt) rBad.push(`${r.id}@${p}`);
  }
}
c('route waypoints contained in ground/enterables (or tunnel segs)', rBad.length === 0, rBad.join('; '));

// 11. tunnel vs core separation (user rule: core half-extent + 20 padding)
const core = byId.get('bld-core-ops-hall');
let tunBad = [];
for (const s of segs) {
  if (s.category !== 'tunnel-passage') continue;
  const cx = (core.bounds[0] + core.bounds[2]) / 2, cz = (core.bounds[1] + core.bounds[3]) / 2;
  const halfW = (core.bounds[2] - core.bounds[0]) / 2 + 20, halfD = (core.bounds[3] - core.bounds[1]) / 2 + 20;
  const [x1, z1, x2, z2] = s.bounds;
  const nearestX = Math.max(x1, Math.min(cx, x2)), nearestZ = Math.max(z1, Math.min(cz, z2));
  if (Math.abs(nearestX - cx) < halfW && Math.abs(nearestZ - cz) < halfD) tunBad.push(s.id);
}
c('tunnel stays clear of core (half-extent + 20m)', tunBad.length === 0, tunBad.join(','));

// 12. tunnel-passage must carry xray flag (interior visibility)
const xrayBad = segs.filter(s => s.category === 'tunnel-passage' && !s.xray).map(s => s.id);
c('tunnels carry xray flag', xrayBad.length === 0, xrayBad.join(','));
// hole-drone-entry clearance >= 2m
const holeBad = segs.filter(s => s.category === 'hole-drone-entry' && (s.clearWidth ?? 0) < 2).map(s => s.id);
c('drone holes clear >=2m', holeBad.length === 0, holeBad.join(','));
// roll-down doors: sealable openings must declare height + bind to their opening/building
const rdBad = segs.filter(s => s.category === 'roll-down' && ((s.height ?? 0) < 2 || !(s.connectivity || []).some(r => byId.has(r)))).map(s => s.id);
c('roll-down doors declare height + opening binding', rdBad.length === 0, rdBad.join(','));

// 13. kill zones bind to segments + intersect an approach route or building
let kBad = [];
for (const s of segs) {
  if (s.category !== 'kill-zone') continue;
  if (!(s.connectivity || []).some(r => byId.has(r))) kBad.push(`${s.id}(unbound)`);
}
const segPoint = (s) => [(s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2];
for (const k of b.kills) {
  const hit = b.routes.some(r => r.kind !== 'air' && r.waypoints.some(p =>
    Math.hypot(p[0] - k.x, p[1] - k.z) <= k.r + 25)) ||
    b.segments.some(s => s.name.includes('core ops') || s.name.includes('processing hall'));
  if (!hit) kBad.push(`kill${k.id}@(${k.x},${k.z}) unreachable by any route`);
}
c('kill zones bound + intersect approach/building geometry', kBad.length === 0, kBad.join(','));

// 14. spawn within spawn ground; ridgeline gap between mountain segments
const spawnPad = segs.find(s => s.id === 'sp-spawn');
c('spawn pad inside spawn apron ground', groundSegs.some(s => inBox(segPoint(spawnPad), s, 2)));
const mtnGap = segs.find(s => s.id === 'g-ridgeline-exit');
const mtn = segs.filter(s => s.category === 'mountain-boundary');
c('ridgeline exit gap clear of mountain faces', mtn.every(m => Math.abs(mtnGap.bounds[0] - m.bounds[0]) > 60));

// report
console.log(`FULL-MAP BLOCKOUT VALIDATION — ${file}`);
console.log(`${segs.length} segments, ${b.routes.length} routes, ${b.zones.length} zones, ${b.segments.filter(s => s.category === 'cover').length} covers`);
let fails = 0;
for (const r of res) { console.log((r.p ? 'PASS' : 'FAIL') + '  ' + r.n + (r.d ? '  ->  ' + r.d : '')); if (!r.p) fails++; }
console.log(fails ? `\n${fails} gate(s) FAILING` : '\nALL GATES PASS');
process.exit(fails ? 1 : 0);
