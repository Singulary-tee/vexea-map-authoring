#!/usr/bin/env node
// blockout-validate-v2.mjs — v0.2 doctrine gates (zones = LLM reasoning regions).
// Usage: node tools/blockout-validate-v2.mjs blockout/blockout-v2.json
import { readFileSync } from 'node:fs';
const path = process.argv[2] ?? 'blockout/blockout-v2.json';
let b; try { b = JSON.parse(readFileSync(path, 'utf8')); }
catch (e) { console.error('cannot read/parse', path, e.message); process.exit(2); }

const res = []; const c = (n, p, d = '') => res.push({ n, p, d });
const W = b.world, inWorld = (bb) => bb[0] >= W.xMin && bb[1] <= W.xMax && bb[2] >= W.zMin && bb[3] <= W.zMax;
const rectGap = (a, bb2) => Math.max(bb2[0] - a[1], a[0] - bb2[1], bb2[2] - a[3], a[2] - bb2[3], 0);

const zones = b.zones ?? [];
const zids = zones.map(z => z.id); const zdups = zids.filter((x, i) => zids.indexOf(x) !== i);
const zmap = new Map(zones.map(z => [z.id, z]));

// 1. zone granularity: enough regions for LLM reasoning (>=10), unique, complete
c('zone count >= 10 (LLM reasoning granularity)', zones.length >= 10, `n=${zones.length}`);
c('zone ids unique', zdups.length === 0, zdups.join(','));
const zBad = zones.filter(z => !z.bounds || !Array.isArray(z.bounds) || z.bounds.length !== 4 || z.threat === undefined || !z.role);
c('zones have bounds+threat+role', zBad.length === 0, zBad.map(z => z.id).join(','));
c('all zones inside world bounds', zones.every(z => inWorld(z.bounds)), zones.filter(z => !inWorld(z.bounds)).map(z => z.id).join(','));

// 2. zones are NOT buildings: no floors/footprint on zone records; buildings separate + resolve
const zAsBld = zones.filter(z => z.floors !== undefined || z.footprint !== undefined);
c('zones do not carry building fields (floors/footprint)', zAsBld.length === 0, zAsBld.map(z => z.id).join(','));
const blds = b.buildings ?? [];
const bldBad = blds.filter(x => !zmap.has(x.zone) || !x.footprint || !inWorld(x.footprint) || !x.height);
c('buildings reference valid zones, footprints in-world', bldBad.length === 0, bldBad.map(x => x.id).join(','));
c('most buildings are facades (target-map guidance: majority facade)',
  blds.length === 0 || blds.filter(x => x.category === 'facade-non-enterable').length >= Math.ceil(blds.length / 2),
  `${blds.filter(x => x.category === 'facade-non-enterable').length}/${blds.length} facade`);

// 3. drone spawn points >= 3 across >= 3 zones; kill zones >= 2
const spawnZones = zones.filter(z => z.droneSpawn);
c('drone spawn points >= 3', spawnZones.length >= 3, `n=${spawnZones.length}`);
c('drone spawns spread across >= 3 zones', new Set(spawnZones.map(z => z.id)).size >= 3);
const kz = zones.filter(z => z.killZone);
c('kill zones >= 2', kz.length >= 2, `n=${kz.length} (${kz.map(z => z.id).join(',')})`);
// 4. adjacency: resolves, connected, spawn->core, >=3 independent paths, chokepoints exist
const adj = b.adjacency ?? [];
const dang = adj.filter(e => !zmap.has(e.from) || !zmap.has(e.to));
c('adjacency refs resolve to zones', dang.length === 0, dang.map(e => e.from + '->' + e.to).join('; '));
const g = new Map(zids.map(id => [id, []]));
for (const e of adj) { g.get(e.from)?.push(e.to); g.get(e.to)?.push(e.from); }
const seen = new Set(); const q0 = [zones.find(z => z.playerSpawn)?.id ?? zids[0]];
if (q0[0]) { seen.add(q0[0]); while (q0.length) { const n = q0.shift(); for (const nb of g.get(n) ?? []) if (!seen.has(nb)) { seen.add(nb); q0.push(nb); } } }
c('zone graph fully connected', seen.size === zids.length, `reached ${seen.size}/${zids.length}`);
const spawn = zones.find(z => z.playerSpawn)?.id;
const core = zones.find(z => z.role?.includes('WIN CONDITION'))?.id;
let paths = 0;
if (spawn && core) {
  const gcopy = new Map([...g].map(([k, v]) => [k, [...v]]));
  for (let i = 0; i < 4; i++) {
    const prev = new Map([[spawn, null]]); const qq = [spawn]; let hit = false;
    while (qq.length) { const n = qq.shift(); if (n === core) { hit = true; break; }
      for (const nb of gcopy.get(n) ?? []) if (!prev.has(nb)) { prev.set(nb, n); qq.push(nb); } }
    if (!hit) break; paths++;
    let cur = core; while (cur !== spawn) { const p = prev.get(cur); gcopy.set(p, (gcopy.get(p) ?? []).filter(x => x !== cur)); cur = p; }
  }
}
c('spawn->core with >=2 independent attack paths (flank/surround)', paths >= 2, `paths=${paths}`);
// distinct edges entering the core pocket (core_yard + core_ops) — commander must defend several
const pocket = new Set(['zone_core_yard', 'zone_core_ops']);
const pocketIns = new Set(adj.filter(e => pocket.has(e.to) && !pocket.has(e.from)).map(e => e.from + '>' + e.to));
c('core pocket has >=3 distinct entrances (defend several lanes)', pocketIns.size >= 3, [...pocketIns].join('; '));
c('chokepoint edges exist (>=2)', adj.filter(e => e.kind === 'chokepoint').length >= 2, `n=${adj.filter(e => e.kind === 'chokepoint').length}`);

// 5. tunnel-core separation (target-map flaw): tunnel zones far from core zone
const coreZ = zones.find(z => z.id === 'zone_core_ops');
const tunZ = zones.filter(z => z.id.includes('tunnel'));
const tooClose = tunZ.filter(z => rectGap(z.bounds, coreZ.bounds) < 60);
c('tunnel zones >= 60m from core zone (no core-hugging tunnels)', tooClose.length === 0,
  tooClose.map(z => `${z.id} gap=${rectGap(z.bounds, coreZ.bounds)}m`).join('; '));

// 6. vertical gauges (calibration): stair rise<=0.18 tread>=0.28; ramp grade<=1:12; hosts resolve
const hostIds = new Set([...blds.map(x => x.id), ...zmap.keys()]);
const vBad = (b.vertical ?? []).filter(v => {
  const g2 = v.gauge ?? {};
  if (v.kind === 'stair' && (g2.rise > 0.18 || (g2.tread ?? 1) < 0.28)) return true;
  if (v.kind === 'ramp' && g2.grade && g2.grade !== '1:12' && g2.grade !== '1:10') return true;
  return !v.host || !hostIds.has(v.host);
});
c('vertical elements gauge-legal + hosts resolve', vBad.length === 0, vBad.map(v => v.id).join(','));
c('vertical elements exist (height-variation fix)', (b.vertical ?? []).length >= 5, `n=${(b.vertical ?? []).length}`);

// 7. routes: kinds valid; tunnel route below grade; points in world
const rBad = (b.routes ?? []).filter(r => !['surface', 'covered', 'tunnel'].includes(r.kind) ||
  (r.kind === 'tunnel' && r.belowGradeY === undefined) ||
  (r.points ?? []).some(p => p[0] < W.xMin || p[0] > W.xMax || p[1] < W.zMin || p[1] > W.zMax));
c('routes valid kinds + tunnel below grade + points in world', rBad.length === 0, rBad.map(r => r.id).join(','));
const kinds = new Set((b.routes ?? []).map(r => r.kind));
c('route network has all three kinds (surface/covered/tunnel)', kinds.size === 3, [...kinds].join(','));

// 8. surveillance: >= 4, all destructible (contract: cameras shootable)
const cams = b.surveillance ?? [];
c('surveillance cameras >= 4, all destructible', cams.length >= 4 && cams.every(x => x.destructible), `n=${cams.length}`);

let fails = 0;
console.log('BLOCKOUT V2 VALIDATION —', path);
for (const r of res) { console.log((r.p ? 'PASS' : 'FAIL') + '  ' + r.n + (r.d ? '  ->  ' + r.d : '')); if (!r.p) fails++; }
console.log(fails ? `\n${fails} gate(s) FAILING` : '\nALL GATES PASS');
process.exit(fails ? 1 : 0);
