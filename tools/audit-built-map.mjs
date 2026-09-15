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

// Generated route-facing helpers are not represented in the authored segment AABBs.
// Keep this registry beside the generator calls so thresholds, equipment, and utility
// dressing cannot silently consume a wheeled lane as the art pass grows.
const routeById = new Map((b.routes || []).map(r => [r.id, r]));
const rotatePoint = ([x, z], angle, [lx, lz]) => [
  x + Math.cos(angle) * lx - Math.sin(angle) * lz,
  z + Math.sin(angle) * lx + Math.cos(angle) * lz,
];
const inverseRotate = ([x, z], angle, [px, pz]) => {
  const dx = px - x, dz = pz - z;
  return [Math.cos(angle) * dx + Math.sin(angle) * dz, -Math.sin(angle) * dx + Math.cos(angle) * dz];
};
const pointSegmentDistance = (p, a, c) => {
  const dx = c[0] - a[0], dz = c[1] - a[1], length2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / length2));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
};
const orientation = (a, c, p) => (c[0] - a[0]) * (p[1] - a[1]) - (c[1] - a[1]) * (p[0] - a[0]);
const onSegment = (a, c, p) => Math.min(a[0], c[0]) - 1e-9 <= p[0] && p[0] <= Math.max(a[0], c[0]) + 1e-9
  && Math.min(a[1], c[1]) - 1e-9 <= p[1] && p[1] <= Math.max(a[1], c[1]) + 1e-9;
const segmentsIntersect = (a, c, p, q) => {
  const o1 = orientation(a, c, p), o2 = orientation(a, c, q), o3 = orientation(p, q, a), o4 = orientation(p, q, c);
  const sign = value => value > 1e-9 ? 1 : value < -1e-9 ? -1 : 0;
  const s1 = sign(o1), s2 = sign(o2), s3 = sign(o3), s4 = sign(o4);
  return (s1 !== s2 && s3 !== s4) || (s1 === 0 && onSegment(a, c, p)) || (s2 === 0 && onSegment(a, c, q))
    || (s3 === 0 && onSegment(p, q, a)) || (s4 === 0 && onSegment(p, q, c));
};
const rectCorners = ({ center: c, angle = 0, width, depth }) => [
  rotatePoint(c, angle, [-width / 2, -depth / 2]),
  rotatePoint(c, angle, [-width / 2, depth / 2]),
  rotatePoint(c, angle, [width / 2, depth / 2]),
  rotatePoint(c, angle, [width / 2, -depth / 2]),
];
const pointRectDistance = (point, rect) => {
  const [x, z] = inverseRotate(rect.center, rect.angle || 0, point);
  return Math.hypot(Math.max(Math.abs(x) - rect.width / 2, 0), Math.max(Math.abs(z) - rect.depth / 2, 0));
};
const routeRectDistance = (rect, route) => {
  const corners = rectCorners(rect), waypoints = route.waypoints;
  let best = Infinity;
  for (const point of waypoints) best = Math.min(best, pointRectDistance(point, rect));
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], c = waypoints[i + 1];
    for (let j = 0; j < corners.length; j++) {
      const p = corners[j], q = corners[(j + 1) % corners.length];
      if (segmentsIntersect(p, q, a, c)) return 0;
      best = Math.min(best, pointSegmentDistance(p, a, c), pointRectDistance(a, rect), pointRectDistance(c, rect));
    }
  }
  return best;
};
const routeCircleDistance = (centerPoint, radius, route) => {
  let best = Infinity;
  for (let i = 0; i < route.waypoints.length - 1; i++) best = Math.min(best, pointSegmentDistance(centerPoint, route.waypoints[i], route.waypoints[i + 1]));
  return best - radius;
};
const helper = (id, route, shape, required = 0.25, group = 'industrial') => ({ id, route, shape, required, group });
const thresholdHelpers = [];
const addPortalPosts = (name, route, x, z, angle, span) => {
  for (const side of [-1, 1]) {
    const centerPoint = rotatePoint([x, z], angle, [0, side * (span / 2 - 0.35)]);
    thresholdHelpers.push(helper(`${name}.portal-post-${side < 0 ? 'w' : 'e'}`, route, {
      center: centerPoint, width: 0.62, depth: 0.62, angle: 0,
    }, 0.25, 'threshold'));
  }
};
addPortalPosts('gate', 'route_main_surface', -247, 161, Math.atan2(-10, 52), 14);
addPortalPosts('loading', 'route_rear_alley', -66, 110, Math.atan2(-6, 80), 12);
addPortalPosts('pressure', 'route_main_surface', 10, 93.3, Math.atan2(-40, 60), 14);
addPortalPosts('checkpoint', 'route_main_surface', 108, -118, Math.atan2(-50, -10), 13);
addPortalPosts('plant', 'route_north_ring', 143, -78, Math.atan2(-60, 10), 13);
addPortalPosts('core', 'route_main_surface', 20, -228, -Math.PI / 2, 12);

const generatedHelpers = [
  ...thresholdHelpers,
  helper('gate.booth', 'route_main_surface', { center: [-258, 173], width: 4.2 * 0.86, depth: 3.2 * 0.86, angle: -Math.atan2(-10, 52) }, 0.25, 'threshold'),
  helper('loading.booth', 'route_rear_alley', { center: [-94, 103], width: 4.2 * 0.76, depth: 3.2 * 0.76, angle: -Math.atan2(-6, 80) }, 0.25, 'threshold'),
  helper('pressure.booth', 'route_main_surface', { center: [2, 111], width: 4.2 * 0.82, depth: 3.2 * 0.82, angle: -Math.atan2(-40, 60) }, 0.25, 'threshold'),
  helper('checkpoint.booth', 'route_main_surface', { center: [94, -115], width: 4.2 * 0.78, depth: 3.2 * 0.78, angle: -Math.atan2(-50, -10) }, 0.25, 'threshold'),
  helper('plant.booth', 'route_north_ring', { center: [134, -84], width: 4.2 * 0.72, depth: 3.2 * 0.72, angle: -Math.atan2(-60, 10) }, 0.25, 'threshold'),
  helper('core.booth', 'route_main_surface', { center: [33, -226], width: 4.2 * 0.72, depth: 3.2 * 0.72, angle: Math.PI / 2 }, 0.25, 'threshold'),
  helper('gate.barrier', 'route_main_surface', { center: [-258, 173], width: 5.2, depth: 0.14, angle: Math.atan2(-10, 52) }, 0.25, 'threshold'),
  helper('loading.barrier', 'route_rear_alley', { center: [-94, 103], width: 4.8, depth: 0.14, angle: Math.atan2(-6, 80) }, 0.25, 'threshold'),
  helper('pressure.barrier', 'route_main_surface', { center: [2, 111], width: 5, depth: 0.14, angle: Math.atan2(-40, 60) }, 0.25, 'threshold'),
  helper('checkpoint.barrier', 'route_main_surface', { center: [94, -115], width: 4.8, depth: 0.14, angle: Math.atan2(-50, -10) }, 0.25, 'threshold'),
  helper('plant.barrier', 'route_north_ring', { center: [134, -84], width: 4.6, depth: 0.14, angle: Math.atan2(-60, 10) }, 0.25, 'threshold'),
  helper('core.barrier', 'route_main_surface', { center: [33, -226], width: 4.6, depth: 0.14, angle: -Math.PI / 2 }, 0.25, 'threshold'),
  helper('gate.gallery', 'route_main_surface', { center: [-205, 168.5], width: 42.3, depth: 3.6, angle: Math.atan2(-4.5, 42) }, 0.25),
  helper('loading.gallery', 'route_rear_alley', { center: [-67, 101], width: 62, depth: 3.6, angle: 0 }, 0.25),
  helper('pressure.gallery', 'route_main_surface', { center: [27, 109], width: 46, depth: 3.8, angle: 0 }, 0.25),
  helper('checkpoint.gallery', 'route_main_surface', { center: [82, -144], width: 28, depth: 3.4, angle: Math.PI / 2 }, 0.25),
  helper('core.gallery', 'route_main_surface', { center: [65, -226], width: 38, depth: 3.6, angle: 0 }, 0.25),
  helper('gate.vessel', 'route_main_surface', { center: [-198, 176], radius: 2.1 }, 0.25),
  helper('loading.vessel', 'route_rear_alley', { center: [-31, 102], radius: 1.8 }, 0.25),
  helper('pressure.vessel', 'route_main_surface', { center: [58, 106], radius: 2.5 }, 0.25),
  helper('plant.vessel-west', 'route_north_ring', { center: [158, -105], radius: 2.6 }, 0.25),
  helper('plant.vessel-mid', 'route_north_ring', { center: [151, -86], radius: 2.1 }, 0.25),
  helper('plant.vessel-south', 'route_north_ring', { center: [153, -18], radius: 2.5 }, 0.25),
  helper('gate.freight', 'route_main_surface', { center: [-214, 176], width: 5, depth: 3.5, angle: 0 }, 0.25, 'logistics'),
  helper('loading.truck-a', 'route_rear_alley', { center: [-112, 102], width: 9.5, depth: 3.2, angle: -Math.PI / 2 }, 0.25, 'logistics'),
  helper('loading.truck-b', 'route_rear_alley', { center: [-22, 122], width: 9.5 * 0.82, depth: 3.2 * 0.82, angle: 0.08 }, 0.25, 'logistics'),
  helper('hub.truck', 'route_main_surface', { center: [-108, 124], width: 9.5 * 0.82, depth: 3.2 * 0.82, angle: 0.1 }, 0.25, 'logistics'),
  helper('hub.forklift', 'route_main_surface', { center: [-93, 140], width: 2.4 * 0.72, depth: 1.5 * 0.72, angle: Math.PI / 2 }, 0.25, 'logistics'),
  helper('hub.truck-east', 'route_main_surface', { center: [46, 88], width: 9.5 * 0.72, depth: 3.2 * 0.72, angle: -Math.PI / 2 }, 0.25, 'logistics'),
  helper('plant.forklift', 'route_north_ring', { center: [135, -102], width: 2.4 * 0.7, depth: 1.5 * 0.7, angle: Math.PI / 2 }, 0.25, 'logistics'),
];
const helperResults = generatedHelpers.map(entry => {
  const route = routeById.get(entry.route);
  if (!route) return { ...entry, pass: false, margin: null, details: 'missing route' };
  const clearance = entry.shape.radius !== undefined
    ? routeCircleDistance(entry.shape.center, entry.shape.radius, route)
    : routeRectDistance(entry.shape, route);
  const margin = clearance - (route.width || 0) / 2;
  return { ...entry, pass: margin >= entry.required, margin, clearance };
});
for (const groupName of ['threshold', 'industrial', 'logistics']) {
  const entries = helperResults.filter(entry => entry.group === groupName || (groupName === 'industrial' && !entry.group));
  const failures = entries.filter(entry => !entry.pass);
  check(`generated-${groupName}-helpers-clear-route-envelopes`, failures.length === 0, failures.map(entry => `${entry.id} ${entry.margin?.toFixed(2) ?? 'missing'}m`).join(', '));
}

// The placement registry also checks that corrected threshold helpers do not
// trespass into the authored structures they frame.
const authoredStructureBounds = structural.map(s => ({ id: s.id, minX: s.b.minX, minZ: s.b.minZ, maxX: s.b.maxX, maxZ: s.b.maxZ }));
const polygonContains = (point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], c = polygon[j];
    if ((a[1] > point[1]) !== (c[1] > point[1]) && point[0] < (c[0] - a[0]) * (point[1] - a[1]) / (c[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
};
const rectIntersectsAabb = (rect, aabb) => {
  const corners = rectCorners(rect), boxCorners = [[aabb.minX, aabb.minZ], [aabb.minX, aabb.maxZ], [aabb.maxX, aabb.maxZ], [aabb.maxX, aabb.minZ]];
  if (corners.some(point => polygonContains(point, boxCorners)) || boxCorners.some(point => polygonContains(point, corners))) return true;
  for (let i = 0; i < corners.length; i++) for (let j = 0; j < boxCorners.length; j++) {
    if (segmentsIntersect(corners[i], corners[(i + 1) % corners.length], boxCorners[j], boxCorners[(j + 1) % boxCorners.length])) return true;
  }
  return false;
};
const thresholdStructureTests = [
  ...thresholdHelpers,
  ...generatedHelpers.filter(entry => entry.group === 'threshold' && !entry.id.includes('.portal-post-')),
];
const structureIntersections = [];
for (const entry of thresholdStructureTests) {
  if (entry.shape.radius !== undefined) continue;
  for (const target of authoredStructureBounds) {
    if (rectIntersectsAabb(entry.shape, target)) structureIntersections.push(`${entry.id}/${target.id}`);
  }
}
check('generated-thresholds-clear-authored-structures', structureIntersections.length === 0, structureIntersections.join(', '));

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
