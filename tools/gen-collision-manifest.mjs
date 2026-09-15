#!/usr/bin/env node
// gen-collision-manifest: static-collision AABB manifest for the game's Rapier layer.
// Solid volumes (buildings, walls, fences, tower, bridge deck, covers, canopies' posts,
// mountains, roll-downs) -> axis-aligned boxes in world coords; walkable ground surfaces;
// below-grade tunnel volumes separated (y from belowGradeY). Emits out/collision-manifest.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const file = process.argv[2] ?? 'blockout/blockout-full-v1.json';
const b = JSON.parse(readFileSync(file, 'utf8'));
const segs = b.segments;
const grounds = segs.filter(s => s.category === 'ground-surface-type');
const surfaceYAt = (x, z) => {
  const candidates = grounds.filter(s => x >= Math.min(s.bounds[0], s.bounds[2]) && x <= Math.max(s.bounds[0], s.bounds[2]) && z >= Math.min(s.bounds[1], s.bounds[3]) && z <= Math.max(s.bounds[1], s.bounds[3]));
  candidates.sort((a, c) => Math.abs((a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1])) - Math.abs((c.bounds[2] - c.bounds[0]) * (c.bounds[3] - c.bounds[1])));
  return candidates[0]?.surfaceY ?? b.terrain?.defaultSurfaceY ?? 0;
};
const terrainY = s => Number.isFinite(s.terrainY) ? s.terrainY : surfaceYAt((s.bounds[0] + s.bounds[2]) / 2, (s.bounds[1] + s.bounds[3]) / 2);
const baseY = s => terrainY(s) + (s.raisedBase ?? s.raisedThreshold ?? 0);
const solids = [
  'building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower',
  'wall-blocking', 'bridge', 'mountain-boundary', 'cover', 'roll-down',
];
const manifest = {
  format: 'vexea-collision/1',
  file,
  source: { path: file, revision: b.meta?.revision ?? null },
  generated: new Date().toISOString().slice(0, 10),
  unit: 'meters',
  yUp: true,
  // AABB records stay x/z-first so the export mirrors authored blockout bounds.
  boxFormat: ['minX', 'minZ', 'maxX', 'minY', 'maxY', 'maxZ'],
  terrain: { defaultSurfaceY: b.terrain?.defaultSurfaceY ?? 0, grading: b.terrain?.grading ?? null },
  colliders: [], walkable: [], warnings: [],
};
const colliders = manifest.colliders, walkable = manifest.walkable;
for (const s of segs) {
  const [x1, z1, x2, z2] = s.bounds;
  if (solids.includes(s.category)) {
    const y2 = s.category === 'cover' ? s.height : (s.category === 'bridge' ? s.height : (s.height || 4));
    // bridges are walkable decks: collider thin + walkable top; building volumes full height
    if (s.category === 'bridge') {
      colliders.push({ id: s.id, kind: 'deck', box: [x1, z1, x2, s.height - 1.2, s.height, z2] });
      walkable.push({ id: s.id + '-deck', box: [x1, z1, x2, s.height, s.height + 0.01, z2], surface: 'metal' });
      continue;
    }
    const y0 = s.category === 'bridge' ? s.height - 1.2 : (s.category === 'cover' ? terrainY(s) : baseY(s));
    colliders.push({ id: s.id, kind: s.category, box: [x1, z1, x2, y0, y0 + y2, z2] });
  }
  if (s.category === 'ground-surface-type') {
    const y = s.surfaceY ?? b.terrain?.defaultSurfaceY ?? 0;
    walkable.push({ id: s.id, box: [x1, z1, x2, y, y + 0.01, z2], surface: s.surface || 'concrete' });
  }
  if (s.category === 'tunnel-passage') {
    const y0 = s.belowGradeY ?? -14;
    const h = s.height || 6;
    const wall = 0.35;
    colliders.push(
      { id: s.id + '-floor', kind: 'tunnel-shell', box: [x1, z1, x2, y0 - 0.2, y0, z2], interior: true, xray: !!s.xray },
      { id: s.id + '-west', kind: 'tunnel-shell', box: [x1, z1, Math.min(x2, x1 + wall), y0, y0 + h, z2], interior: true, xray: !!s.xray },
      { id: s.id + '-east', kind: 'tunnel-shell', box: [Math.max(x1, x2 - wall), z1, x2, y0, y0 + h, z2], interior: true, xray: !!s.xray },
      { id: s.id + '-south', kind: 'tunnel-shell', box: [x1, z1, x2, y0, y0 + h, Math.min(z2, z1 + wall)], interior: true, xray: !!s.xray },
      { id: s.id + '-north', kind: 'tunnel-shell', box: [x1, Math.max(z1, z2 - wall), x2, y0, y0 + h, z2], interior: true, xray: !!s.xray },
      { id: s.id + '-ceiling', kind: 'tunnel-shell', box: [x1, z1, x2, y0 + h - wall, y0 + h, z2], interior: true, xray: !!s.xray },
    );
    walkable.push({ id: s.id + '-floor-surface', box: [x1, z1, x2, y0, y0 + 0.01, z2], surface: 'concrete', tunnel: true, wheelAllowed: true });
  }
  if (s.category === 'incline') {
    // ramp collider: AABB over the incline footprint (game resolves capsule-on-ramp)
    const y = terrainY(s);
    colliders.push({
      id: s.id,
      kind: 'incline',
      box: [x1, z1, x2, y, y + s.height, z2],
      wheelAllowed: true,
      ramp: {
        grade: '1:12',
        riseAlong: 'x',
        baseY: y,
        start: [x1, y, z1],
        end: [x2, y + s.height, z2],
      },
    });
    walkable.push({ id: s.id + '-ramp', box: [x1, z1, x2, y, y + 0.01, z2], surface: 'concrete', ramp: true, wheelAllowed: true });
  }
  if (s.category === 'stair') {
    const y = terrainY(s);
    colliders.push({ id: s.id, kind: 'stair', box: [x1, z1, x2, y, y + (s.height || 1.5), z2], wheelAllowed: false, gauge: s.gauge || null });
    walkable.push({ id: s.id + '-steps', box: [x1, z1, x2, y, y + (s.height || 1.5) + 0.01, z2], surface: 'concrete', stairs: true, wheelAllowed: false, gauge: s.gauge || null });
  }
  if (s.category === 'spawn' || s.category === 'kill-zone') {
    // gameplay volumes: not collision, semantic zones
    manifest[s.category + 'Volumes'] = manifest[s.category + 'Volumes'] || [];
    const y = terrainY(s);
    manifest[s.category + 'Volumes'].push({ id: s.id, box: [x1, z1, x2, y, y + 10, z2] });
  }
}
for (const r of b.routes.filter(r => r.kind !== 'air')) {
  const ys = r.elevations || r.waypoints.map(() => b.terrain?.defaultSurfaceY ?? 0);
  if (ys.length !== r.waypoints.length) manifest.warnings.push(`route ${r.id}: elevations length ${ys.length} != waypoints ${r.waypoints.length}`);
  const xs = r.waypoints.map(p => p[0]), zs = r.waypoints.map(p => p[1]);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  walkable.push({
    id: r.id + '-grade', kind: 'route',
    box: [Math.min(...xs), Math.min(...zs), Math.max(...xs), minY, maxY + 0.01, Math.max(...zs)],
    surface: 'asphalt', width: r.width || 6,
    waypoints: r.waypoints.map(([x, z], i) => [x, ys[i], z]),
    wheelAllowed: r.wheelAllowed ?? true,
    tunnel: r.kind === 'tunnel',
  });
}
// gate: every solid has a collider; no ground segment double-claimed
const solidNoCol = segs.filter(s => solids.includes(s.category) && !colliders.some(c => c.id === s.id)).map(s => s.id);
if (solidNoCol.length) manifest.warnings.push('solids without collider: ' + solidNoCol.join(','));
const doorCols = segs.filter(s => s.category === 'entrance-player').map(s => ({ id: s.id, kind: 'opening', box: s.bounds, height: s.height || 2.4, note: 'must stay clear of colliders' }));
manifest.openings = doorCols;
mkdirSync('out', { recursive: true });
writeFileSync('out/collision-manifest.json', JSON.stringify(manifest, null, 2));
console.log(`colliders: ${colliders.length}, walkable: ${walkable.length}, openings: ${doorCols.length}, warnings: ${manifest.warnings.length}`);
process.exit(manifest.warnings.length ? 1 : 0);
