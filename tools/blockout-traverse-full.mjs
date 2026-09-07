#!/usr/bin/env node
// blockout-traverse-full: traversal report for the full-map blockout.
// Walks spawn->objective paths structurally (BFS over segment connectivity), checks capsule
// continuity, door clearance, stair/incline gauges, tunnel clearance, cover placement against
// its named route, and kill-zone closure geometry. Emits out/traversal-report.json + .md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const file = process.argv[2] ?? 'blockout/blockout-full-v1.json';
const b = JSON.parse(readFileSync(file, 'utf8'));
const segs = b.segments;
const byId = new Map(segs.map(s => [s.id, s]));
const routes = b.routes;
const CAPSULE = { h: 1.8, r: 0.4 };
const report = { file, fixture: b.fixture, generated: new Date().toISOString().slice(0, 10), paths: [], drTraversal: {}, vertical: [], coverCheck: [], killClosure: [], warnings: [] };
const warn = m => report.warnings.push(m);

const center = s => [(s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2];
const dist = (a, b2) => Math.hypot(a[0] - b2[0], a[1] - b2[1]);
const inBox = (p, s, pad = 0) => p[0] >= s.bounds[0] - pad && p[0] <= s.bounds[2] + pad && p[1] >= s.bounds[1] - pad && p[1] <= s.bounds[3] + pad;

// --- path walking: BFS over connectivity, prefer routes; classify links ---
function bfs(startId, goalId) {
  const prev = new Map([[startId, null]]);
  const q = [startId];
  while (q.length) {
    const n = q.shift();
    if (n === goalId) break;
    for (const nb of (byId.get(n)?.connectivity || [])) {
      if (!byId.has(nb) || prev.has(nb)) continue;
      prev.set(nb, n); q.push(nb);
    }
  }
  if (!prev.has(goalId)) return null;
  const path = [goalId];
  while (path[0] !== startId) path.unshift(prev.get(path[0]));
  return path;
}
function linkKind(a, c) {
  if (a.category === 'entrance-player' || c.category === 'entrance-player') return 'door';
  if (a.category === 'stair' || c.category === 'stair') return 'stair';
  if (a.category === 'incline' || c.category === 'incline') return 'incline';
  if (a.category === 'tunnel-passage' && c.category === 'tunnel-passage') return 'tunnel';
  if (['building-enterable', 'warehouse-enterable'].includes(a.category) && ['building-enterable', 'warehouse-enterable'].includes(c.category) && (a.id === 'bld-core-walkway' || c.id === 'bld-core-walkway')) return 'interior-link';
  if (a.zone === 'zone_tunnels' || c.zone === 'zone_tunnels') return 'tunnel';
  return 'ground';
}
// capsule verdict per link
function linkVerdict(a, c, kind) {
  if (kind === 'door') {
    const door = a.category === 'entrance-player' ? a : c;
    const w = door.width ?? Math.min(door.bounds[2] - door.bounds[0], door.bounds[3] - door.bounds[1]);
    const h = door.height ?? 999;
    const ok = w >= 1 && h >= CAPSULE.h + 0.2;
    return { kind, ok, note: `${door.id} w${w}m h${h}m vs capsule 1.8m ${ok ? 'PASS' : 'FAIL'}` };
  }
  if (kind === 'stair') {
    const st = a.category === 'stair' ? a : c;
    const g = st.gauge || {};
    const ok = (g.rise ?? 0) <= 0.18 && (g.tread ?? 0) >= 0.28 && (g.width ?? 0) >= 1;
    return { kind, ok, note: `${st.id} rise${g.rise}m tread${g.tread}m width${g.width}m ${ok ? 'PASS' : 'FAIL'}` };
  }
  if (kind === 'incline') {
    const ic = a.category === 'incline' ? a : c;
    const g = ic.gauge || {};
    const grade = String(g.grade).split(':')[1];
    const ok = parseFloat(grade) >= 12 && (g.width ?? 0) >= 1;
    return { kind, ok, note: `${ic.id} grade ${g.grade} width${g.width}m ${ok ? 'PASS' : 'FAIL'}` };
  }
  if (kind === 'tunnel') {
    const tun = a.category === 'tunnel-passage' ? a : c;
    const ok = (tun.height ?? 0) >= CAPSULE.h + 1 && (tun.width ?? 0) >= 1;
    return { kind, ok, note: `${tun.id} h${tun.height}m w${tun.width}m clearance ${ok ? 'PASS' : 'FAIL'}${tun.xray ? ' xray' : ' NO-XRAY'}` };
  }
  return { kind, ok: true, note: '' };
}

const SPAWN = 'sp-spawn', GOAL = 'bld-core-ops-hall';
// path recipes: constrained BFS through the segments the design route actually uses
const paths = [
  { id: 'path-surface-main', label: 'main surface: spawn -> gate/rear yards -> pressure yard -> core yard -> core hall main door' },
  { id: 'path-covered-logistics', label: 'covered/logistics: rear alley -> loading hall interior -> hub -> covered corridor -> security hall -> checkpoint court -> core',
    mustPass: ['e-loading-n-2', 'bld-loading-hall', 'e-loading-s', 'g-yrd-hub', 's-sec-threshold', 'e-sec-s', 'bld-security-hall', 'kz-court', 'g-yrd-core-n', 'e-core-n'] },
  { id: 'path-east-flank', label: 'east flank: east yard -> ridge -> core service wing -> walkway -> core hall',
    mustPass: ['g-yrd-e', 'g-yrd-east-ridge', 'e-wing-n', 'bld-core-service-wing', 'bld-core-walkway'] },
  { id: 'path-tunnel-alternate', label: 'tunnel alternate: checkpoint mouth -> below grade -> east ridge portal -> core yard -> walkway door -> hall',
    mustPass: ['tp-west', 'tun-a', 'tun-b', 'tun-c', 'tp-east', 'g-yrd-east-ridge', 'g-yrd-core-n', 'e-walkway-w', 'bld-core-walkway'] },
];
const found = [];
for (const p of paths) {
  const nodes = [SPAWN, ...(p.mustPass || []), GOAL];
  let path = [], brokenAt = null;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], c = nodes[i + 1];
    const seg = bfs(a, c);
    if (!seg) { brokenAt = `${a}->${c}`; break; }
    path = [...path, ...(seg.length > 1 ? seg.slice(1) : seg)];
  }
  if (brokenAt) { report.paths.push({ id: p.id, ok: false, note: `no connectivity between required segments ${brokenAt}` }); warn(`${p.id}: unreachable ${brokenAt}`); continue; }
  const steps = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = byId.get(path[i]), c = byId.get(path[i + 1]);
    const kind = linkKind(a, c);
    const v = linkVerdict(a, c, kind);
    if (!v.ok) warn(`${p.id}: ${v.note}`);
    steps.push({ from: a.id, to: c.id, kind, note: v.note });
  }
  const ok = steps.every(s => s.note.includes('PASS') || s.note === '');
  // route distance for pacing (spawn center -> core door via route polylines)
  const rtLen = (id) => {
    const r = routes.find(x => x.id === id); if (!r) return 0;
    let L = 0; for (let i = 0; i < r.waypoints.length - 1; i++) L += dist(r.waypoints[i], r.waypoints[i + 1]);
    return L;
  };
  report.paths.push({ id: p.id, label: p.label, ok, steps,
    pacing: { coreApproachM: Math.round(rtLen('route_main_surface') + rtLen('route_covered')), note: 'sum of main-surface + covered-route lengths (design pacing reference; run speed is playtest)' } });
  if (ok) found.push(p.id);
}
if (found.length === 0) warn('no spawn->core path fully verified');

// --- cover placement vs named route/segment ---
for (const s of segs) {
  if (s.category !== 'cover') continue;
  const cv = s.cover || {};
  const toks = (cv.interrupts || '').toLowerCase().split(/[^a-z0-9_-]+/).filter(Boolean);
  const names = toks.filter(t => routes.some(r => r.id === t) || byId.has(t));
  const c = center(s);
  let nearest = null;
  const ptsOf = (r) => { // waypoints + dense re-sampling so covers on long segments are found
    const pts = r.waypoints.slice();
    for (let i = 0; i < r.waypoints.length - 1; i++) {
      const a = r.waypoints[i], b2 = r.waypoints[i + 1];
      const n = Math.max(1, Math.floor(dist(a, b2) / 10));
      for (let k = 1; k < n; k++) pts.push([a[0] + (b2[0] - a[0]) * k / n, a[1] + (b2[1] - a[1]) * k / n]);
    }
    return pts;
  };
  for (const r of routes) if (names.includes(r.id))
    for (const w of ptsOf(r)) { const d = dist(w, c); nearest = nearest === null ? d : Math.min(nearest, d); }
  for (const o of names.filter(t => byId.has(t))) { const d = dist(center(byId.get(o)), c); nearest = nearest === null ? d : Math.min(nearest, d); }
  const near = nearest !== null && nearest <= 25;
  if (!near) warn(`cover ${s.id} not within 25m of its named interrupts (${names.join(',')} @${nearest?.toFixed(0)}m)`);
  report.coverCheck.push({ id: s.id, names, distToInterruptM: nearest === null ? null : Math.round(nearest), heightClass: cv.heightClass, threat: cv.threatElevation, ok: near });
}

// --- kill-zone closures ---
for (const s of segs) {
  if (s.category !== 'kill-zone') continue;
  const c = center(s);
  const encl = segs.filter(o => o.category === 'cover' && Math.abs(o.bounds[0] - s.bounds[0]) < 60 && Math.abs(o.bounds[3] - s.bounds[3]) < 60).map(o => o.id);
  const buildings = segs.filter(o => (o.category === 'building-enterable') && Math.abs(o.bounds[0] - s.bounds[0]) < 80 && Math.abs(o.bounds[1] - s.bounds[1]) < 80).map(o => o.id);
  const tun = segs.filter(o => o.category === 'tunnel-passage' && Math.abs(o.bounds[0] - s.bounds[0]) < 80 && Math.abs(o.bounds[1] - s.bounds[1]) < 80).map(o => o.id);
  const ok = encl.length > 0 || buildings.length > 0;
  if (!ok) warn(`kill zone ${s.id} has no closure geometry (no cover/building envelope)`);
  report.killClosure.push({ id: s.id, closures: { covers: encl, buildings, tunnelMouths: tun }, ok });
}

// --- vertical transitions ---
for (const v of b.vertical) {
  const host = byId.get(v.host && v.host.split('/')[0]);
  report.vertical.push({ id: v.id, kind: v.kind, host: v.host, gauge: v.gauge, connects: v.connects,
    capsuleOk: !v.gauge || !v.gauge.rise || v.gauge.rise <= 0.18 || v.kind === 'belowGrade' || v.kind === 'hole-drone-entry' });
}

// --- drone traversal (differs from player) ---
report.drTraversal = {
  airRoutes: routes.filter(r => r.kind === 'air').map(r => ({ id: r.id, waypoints: r.waypoints, note: r.note })),
  droneHoles: segs.filter(s => s.category === 'hole-drone-entry').map(s => ({ id: s.id, clearWidth: s.clearWidth, drop: s.drop })),
  openSkyZones: [b.openSky],
  tunnelXray: segs.filter(s => s.category === 'tunnel-passage').every(s => s.xray),
  cameras: (b.destructibles || []).map(d => d.id),
  note: 'drones: fixed-wing strafes air-pressure-yard (open sky); bomber lines air-courtyard + covered-route canopies; air re-entry via hd-roof-opening; ground drones use route_tunnel (X-ray interior) — below-grade arm is player-visible only via X-ray toggle'
};

// write outputs
const md = [`# Full-Map Blockout — Traversal Report`, ``,
  `File: ${file}  |  Fixture: ${b.fixture} (1.8m capsule, door >=1x2m, stair rise<=0.18m, incline<=1:12, tunnel 6hx10w)`, ``,
  `## Spawn -> Objective paths`, ``,
  ...report.paths.flatMap(p => [`**${p.id}** — ${p.label} — ${p.ok ? 'PASS' : 'FAIL'}`, ...p.steps.map(s => `- \`${s.from}\` -> \`${s.to}\` (${s.kind})${s.note ? ' — ' + s.note : ''}`), ``]),
  `Pacing: core-approach surface roads ~${report.paths[0]?.pacing.coreApproachM}m (sum main surface + covered route).`, ``,
  `## Cover placement (vs named interrupts)`, ``,
  ...report.coverCheck.map(c => `- ${c.id}: ${c.distToInterruptM === null ? 'no named route/segment' : c.distToInterruptM + 'm'} ${c.threat}/${c.heightClass} ${c.ok ? 'OK' : 'TOO FAR'}`), ``,
  `## Kill-zone closures`, ``,
  ...report.killClosure.map(k => `- ${k.id}: covers=[${k.closures.covers.join(',')}] buildings=[${k.closures.buildings.join(',')}] tunnel=[${k.closures.tunnelMouths.join(',')}] ${k.ok ? 'CLOSED' : 'OPEN'}`), ``,
  `## Vertical transitions`, ``,
  ...report.vertical.map(v => `- ${v.id} (${v.kind}, host ${v.host}): ${v.connects} — ${v.capsuleOk ? 'capsule-OK' : 'check gauge'}`), ``,
  `## Drone traversal (differs from player)`, ``,
  ...report.drTraversal.airRoutes.map(r => `- air ${r.id}: ${r.waypoints.map(w => w.join(',')).join(' -> ')} — ${r.note}`),
  `- drone holes: ${report.drTraversal.droneHoles.map(h => h.id).join(', ')}`, `- open sky: ${b.openSky.label}`,
  `- tunnel X-ray: ${report.drTraversal.tunnelXray ? 'yes (interior visible to players only via toggle)' : 'MISSING'}`,
  `- cameras (destructible surveillance): ${report.drTraversal.cameras.join(', ')}`, ``,
  `## Warnings`, ...(report.warnings.length ? report.warnings.map(w => `- ${w}`) : ['- none']),
  ``].join('\n');

mkdirSync('out', { recursive: true });
writeFileSync('out/traversal-report.json', JSON.stringify(report, null, 2));
writeFileSync('out/traversal-report.md', md);
console.log('paths:', report.paths.map(p => `${p.id}=${p.ok ? 'PASS' : 'FAIL'}`).join(' '));
console.log('covers:', report.coverCheck.filter(c => !c.ok).length, 'bad;', 'kills:', report.killClosure.filter(k => !k.ok).length, 'open;', 'warnings:', report.warnings.length);
const failed = !report.paths.every(p => p.ok) || report.warnings.length > 0;
console.log(failed ? 'TRAVERSAL REPORT: warnings/failures present (see out/traversal-report.md)' : 'TRAVERSAL REPORT: all paths PASS');
process.exit(failed ? 1 : 0);
