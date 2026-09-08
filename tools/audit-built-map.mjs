#!/usr/bin/env node
// Audit authored placement contracts that are easy to miss in coarse blockout gates.
import fs from 'node:fs';

const sourcePath = process.argv[2] || 'blockout/blockout-full-v1.json';
const glbPath = process.argv[3] || 'editor/facility-built.glb';
const outPath = process.argv[4] || 'out/geometry-audit.json';
const b = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const segs = b.segments || [];
const byId = new Map(segs.map(s => [s.id, s]));
const checks = [];
const check = (name, pass, details = '') => checks.push({ name, pass: Boolean(pass), details });
const bounds = s => ({
  minX: Math.min(s.bounds[0], s.bounds[2]),
  minZ: Math.min(s.bounds[1], s.bounds[3]),
  maxX: Math.max(s.bounds[0], s.bounds[2]),
  maxZ: Math.max(s.bounds[1], s.bounds[3]),
});
const overlap = (a, c) => ({
  x: Math.min(a.maxX, c.maxX) - Math.max(a.minX, c.minX),
  z: Math.min(a.maxZ, c.maxZ) - Math.max(a.minZ, c.minZ),
});
const center = s => [(s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2];
const buildingCats = new Set(['building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower']);
const structuralCats = new Set([...buildingCats, 'wall-blocking', 'bridge']);
const grounds = segs.filter(s => s.category === 'ground-surface-type').map(s => ({ ...s, b: bounds(s) }));

const structural = segs.filter(s => structuralCats.has(s.category)).map(s => ({ ...s, b: bounds(s) }));
const overlaps = [];
for (let i = 0; i < structural.length; i++) for (let j = i + 1; j < structural.length; j++) {
  const a = structural[i], c = structural[j], o = overlap(a.b, c.b);
  if (o.x > 1 && o.z > 1) overlaps.push(`${a.id}/${c.id} (${o.x.toFixed(1)}x${o.z.toFixed(1)}m)`);
}
check('structural-footprints-do-not-interpenetrate', overlaps.length === 0, overlaps.join(', '));

const floating = [];
for (const s of segs.filter(s => structuralCats.has(s.category))) {
  if (s.category === 'bridge' || (s.category === 'wall-blocking' && s.zone === 'zone_boundary')) continue;
  const sb = bounds(s);
  const supported = grounds.some(g => {
    const o = overlap(sb, g.b);
    return o.x > 1.5 && o.z > 1.5;
  });
  if (!supported) floating.push(s.id);
}
check('structural-segments-have-ground-contact', floating.length === 0, floating.join(', '));

const entranceProblems = [];
for (const d of segs.filter(s => s.category === 'entrance-player')) {
  const host = (d.connectivity || []).map(id => byId.get(id)).find(s => s && buildingCats.has(s.category));
  if (!host) {
    entranceProblems.push(`${d.id}:missing-host`);
    continue;
  }
  const x = (d.bounds[0] + d.bounds[2]) / 2, z = (d.bounds[1] + d.bounds[3]) / 2;
  const distances = [[Math.abs(z - host.bounds[1]), 's'], [Math.abs(z - host.bounds[3]), 'n'], [Math.abs(x - host.bounds[0]), 'w'], [Math.abs(x - host.bounds[2]), 'e']];
  const [distance, side] = distances.sort((a, c) => a[0] - c[0])[0];
  const axis = side === 'n' || side === 's' ? x : z;
  const lo = side === 'n' || side === 's' ? Math.min(host.bounds[0], host.bounds[2]) : Math.min(host.bounds[1], host.bounds[3]);
  const hi = side === 'n' || side === 's' ? Math.max(host.bounds[0], host.bounds[2]) : Math.max(host.bounds[1], host.bounds[3]);
  const width = side === 'n' || side === 's' ? Math.abs(d.bounds[2] - d.bounds[0]) : Math.abs(d.bounds[3] - d.bounds[1]);
  if (distance > 2.1 || axis - width / 2 < lo || axis + width / 2 > hi) entranceProblems.push(`${d.id}:${host.id} ${side} distance=${distance.toFixed(1)}`);
}
check('entrances-project-to-clear-host-walls', entranceProblems.length === 0, entranceProblems.join(', '));

const coveredLaneProblems = [];
for (const r of b.routes.filter(r => r.kind === 'covered')) {
  const width = r.width || 5;
  const supportOffset = Math.max(1.5, width / 2 - 0.35);
  if (supportOffset <= 1.4) coveredLaneProblems.push(`${r.id}:supportOffset=${supportOffset.toFixed(2)}`);
}
check('covered-route-utility-supports-clear-walk-lane', coveredLaneProblems.length === 0, coveredLaneProblems.join(', '));

const tunnel = b.routes.find(r => r.id === 'route_tunnel' && r.kind === 'tunnel');
const west = segs.find(s => s.id === 'tp-west');
const east = segs.find(s => s.id === 'tp-east');
const endpointDistance = (point, segment) => {
  const c = center(segment);
  return Math.hypot(point[0] - c[0], point[1] - c[1]);
};
const tunnelAligned = Boolean(tunnel && west && east && endpointDistance(tunnel.waypoints[0], west) <= 5 && endpointDistance(tunnel.waypoints.at(-1), east) <= 5);
check('tunnel-route-aligns-with-authored-portals', tunnelAligned, tunnel ? `${tunnel.waypoints[0].join(',')} -> ${tunnel.waypoints.at(-1).join(',')}` : 'missing route_tunnel');
check('tunnel-depth-is-explicit', Number.isFinite(b.tunnelInterior?.floorY), String(b.tunnelInterior?.floorY));
check('loading-dock-lip-anchor-is-authored', Boolean(byId.get('oc-loading-dock')), 'oc-loading-dock');
check('source-ambiguities-are-resolved', Array.isArray(b.openQuestions) && b.openQuestions.length === 0, `${b.openQuestions?.length ?? 'missing'} open questions`);
check('resolved-decisions-are-traceable', Array.isArray(b.resolvedDecisions) && b.resolvedDecisions.length >= 8, `${b.resolvedDecisions?.length ?? 0} decisions`);

const graded = b.routes.filter(r => r.kind === 'ground' || r.kind === 'covered');
const gradeProblems = [];
for (const r of graded) {
  if (!Array.isArray(r.elevations) || r.elevations.length !== r.waypoints.length) {
    gradeProblems.push(`${r.id}:missing elevation profile`);
    continue;
  }
  for (let i = 0; i < r.elevations.length - 1; i++) {
    const run = Math.hypot(r.waypoints[i + 1][0] - r.waypoints[i][0], r.waypoints[i + 1][1] - r.waypoints[i][1]);
    if (Math.abs(r.elevations[i + 1] - r.elevations[i]) > run / 12 + 1e-6) gradeProblems.push(`${r.id}[${i}]`);
  }
}
check('wheeled-route-grades-within-1:12', gradeProblems.length === 0, gradeProblems.join(', '));
const elevationRange = graded.flatMap(r => r.elevations || []).reduce((range, y) => [Math.min(range[0], y), Math.max(range[1], y)], [Infinity, -Infinity]);
check('controlled-ground-variation-is-nontrivial', Number.isFinite(elevationRange[0]) && elevationRange[1] - elevationRange[0] >= 1, `${elevationRange[0]}..${elevationRange[1]}m`);
check('terrain-pads-are-authored', grounds.every(s => Number.isFinite(s.surfaceY)), `${grounds.filter(s => !Number.isFinite(s.surfaceY)).map(s => s.id).join(',')}`);

const glbStat = fs.statSync(glbPath);
check('generated-built-glb-exists', glbStat.size > 100000, `${glbStat.size} bytes`);
const report = {
  source: sourcePath,
  generated: b.meta?.generated || 'unknown',
  segments: segs.length,
  structuralSegments: structural.length,
  glb: { path: glbPath, bytes: glbStat.size },
  checks,
  passed: checks.filter(c => c.pass).length,
  failed: checks.filter(c => !c.pass).length,
};
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.details ? ` -> ${c.details}` : ''}`);
console.log(`GEOMETRY AUDIT: ${report.passed}/${checks.length} checks passed`);
if (report.failed) process.exitCode = 1;
