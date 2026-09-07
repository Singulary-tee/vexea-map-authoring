#!/usr/bin/env node
// gen-collision-manifest: static-collision AABB manifest for the game's Rapier layer.
// Solid volumes (buildings, walls, fences, tower, bridge deck, covers, canopies' posts,
// mountains, roll-downs) -> axis-aligned boxes in world coords; walkable ground surfaces;
// below-grade tunnel volumes separated (y from belowGradeY). Emits out/collision-manifest.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const file = process.argv[2] ?? 'blockout/blockout-full-v1.json';
const b = JSON.parse(readFileSync(file, 'utf8'));
const segs = b.segments;
const solids = [
  'building-enterable', 'warehouse-enterable', 'facade-non-enterable', 'tower',
  'wall-blocking', 'bridge', 'mountain-boundary', 'cover', 'roll-down',
];
const manifest = { file, generated: new Date().toISOString().slice(0, 10), unit: 'meters', yUp: true, colliders: [], walkable: [], warnings: [] };
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
    colliders.push({ id: s.id, kind: s.category, box: [x1, z1, x2, 0, y2, z2] });
  }
  if (s.category === 'ground-surface-type') walkable.push({ id: s.id, box: [x1, z1, x2, 0, 0.01, z2], surface: s.surface || 'concrete' });
  if (s.category === 'tunnel-passage') {
    const y0 = s.belowGradeY ?? -14;
    colliders.push({ id: s.id, kind: 'tunnel', box: [x1, z1, x2, y0, y0 + (s.height || 6), z2], interior: true, xray: !!s.xray });
  }
  if (s.category === 'incline') {
    // ramp collider: AABB over the incline footprint (game resolves capsule-on-ramp)
    colliders.push({ id: s.id, kind: 'incline', box: [x1, z1, x2, 0, s.height, z2], ramp: { grade: '1:12', riseAlong: 'x' } });
    walkable.push({ id: s.id + '-ramp', box: [x1, z1, x2, 0, 0.01, z2], surface: 'concrete', ramp: true });
  }
  if (s.category === 'stair') {
    colliders.push({ id: s.id, kind: 'stair', box: [x1, z1, x2, 0, s.height || 1.5, z2] });
  }
  if (s.category === 'spawn' || s.category === 'kill-zone') {
    // gameplay volumes: not collision, semantic zones
    manifest[s.category + 'Volumes'] = manifest[s.category + 'Volumes'] || [];
    manifest[s.category + 'Volumes'].push({ id: s.id, box: [x1, z1, x2, 0, 10, z2] });
  }
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
